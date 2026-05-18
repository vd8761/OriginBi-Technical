import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as csv from 'fast-csv';
import { Readable } from 'stream';
import axios from 'axios';
import { BulkImportEntity, BulkImportRowEntity } from '../../../entities';
import { RegistrationService } from './registration.service';

@Injectable()
export class BulkAdminUsersService {
  private readonly logger = new Logger(BulkAdminUsersService.name);

  constructor(
    @InjectRepository(BulkImportEntity)
    private bulkImportRepo: Repository<BulkImportEntity>,
    @InjectRepository(BulkImportRowEntity)
    private bulkImportRowRepo: Repository<BulkImportRowEntity>,
    private dataSource: DataSource,
    private registrationService: RegistrationService,
  ) {}

  private normalizeEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  private normalizeMobile(mobile: string): string {
    return String(mobile || '').replace(/\D/g, '');
  }

  async preview(fileBuffer: Buffer, filename: string, userId: number) {
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Invalid file format. Only CSV files are allowed.');
    }

    const importJob = this.bulkImportRepo.create({
      createdById: String(userId),
      filename,
      status: 'DRAFT',
      totalRecords: 0,
      processedCount: 0,
    });
    await this.bulkImportRepo.save(importJob);

    const rawRows: any[] = [];
    const stream = Readable.from(fileBuffer);

    await new Promise((resolve, reject) => {
      csv
        .parseStream(stream, { headers: true, ignoreEmpty: true, trim: true })
        .on('error', (error: any) => reject(new BadRequestException(`Invalid CSV format: ${error.message}`)))
        .on('data', (row: any) => rawRows.push(row))
        .on('end', () => resolve(true));
    });

    const rowsToInsert: BulkImportRowEntity[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const email = this.normalizeEmail(row['Email'] || row['email']);
      const name = row['Name'] || row['name'] || row['FullName'] || row['full_name'];
      const mobile = this.normalizeMobile(row['Mobile'] || row['mobile'] || row['mobile_number']);
      const roleRaw = String(row['Role'] || row['role'] || 'STUDENT').toUpperCase();
      
      let role = 'STUDENT';
      if (['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(roleRaw)) role = 'ADMIN';
      else if (roleRaw === 'PROCTOR') role = 'PROCTOR';

      const dto = {
        email,
        name,
        mobile,
        role,
        gender: row['Gender'] || row['gender'] || 'Male',
      };

      const isValid = email.length > 0;
      const status = isValid ? 'READY' : 'INVALID';
      
      if (isValid) validCount++; else invalidCount++;

      rowsToInsert.push(this.bulkImportRowRepo.create({
        importId: importJob.id,
        rowIndex: i + 1,
        rawData: row,
        normalizedData: dto,
        status,
        resultType: isValid ? null : 'INVALID_DATA',
        errorMessage: isValid ? null : 'Missing required fields (Email)',
      }));
    }

    if (rowsToInsert.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        await this.bulkImportRowRepo.save(rowsToInsert.slice(i, i + chunkSize));
      }
    }

    importJob.totalRecords = rawRows.length;
    await this.bulkImportRepo.save(importJob);

    return {
      importId: importJob.id,
      summary: {
        total: rawRows.length,
        valid: validCount,
        invalid: invalidCount,
      },
      rows: rowsToInsert.map((r) => ({ ...r, import: undefined })),
    };
  }

  async execute(importId: string, overrides?: any[]) {
    const job = await this.bulkImportRepo.findOne({ where: { id: importId } });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.status !== 'DRAFT') throw new BadRequestException(`Job is ${job.status}, cannot execute.`);

    job.status = 'QUEUED';
    await this.bulkImportRepo.save(job);
    
    // Process async
    this.processJob(job.id).catch(err => this.logger.error(`Job ${job.id} failed`, err));
    return { jobId: job.id, status: 'QUEUED' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.bulkImportRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const failed = await this.bulkImportRowRepo.count({ where: { importId: jobId, status: 'FAILED' } });
    const success = await this.bulkImportRowRepo.count({ where: { importId: jobId, status: 'SUCCESS' } });

    const latestFailure = await this.bulkImportRowRepo.findOne({
      where: { importId: jobId, status: 'FAILED' },
      order: { rowIndex: 'ASC' },
    });

    return {
      status: job.status,
      total: job.totalRecords,
      processed: job.processedCount,
      success,
      failed,
      progress: job.totalRecords > 0 ? Math.round((job.processedCount / job.totalRecords) * 100) : 0,
      lastError: latestFailure?.errorMessage,
    };
  }

  async getJobRows(jobId: string) {
    return this.bulkImportRowRepo.find({
      where: { importId: jobId },
      order: { rowIndex: 'ASC' },
    });
  }

  async processJob(jobId: string) {
    this.logger.log(`Starting processing for Job ${jobId}`);
    const job = await this.bulkImportRepo.findOne({ where: { id: jobId } });
    if (!job) return;
    
    job.status = 'PROCESSING';
    await this.bulkImportRepo.save(job);

    try {
      const rows = await this.bulkImportRowRepo.find({
        where: { importId: jobId, status: 'READY' },
        order: { rowIndex: 'ASC' },
      });

      let successCount = 0;
      let failCount = 0;

      for (const row of rows) {
        try {
          const dto = row.normalizedData;
          
          // Register via local RegistrationService (Cognito + DB only, no main app assignments)
          await this.registrationService.registerUser({
            email: dto.email,
            password: 'TempPassword123!',
            fullName: dto.name,
            gender: String(dto.gender || 'MALE').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
            mobileNumber: dto.mobile || '',
            sendEmail: false,
          });

          row.status = 'SUCCESS';
          row.resultType = 'CREATED';
          successCount++;
        } catch (err: any) {
          this.logger.error(`Row ${row.rowIndex} failed execution`, err);
          row.status = 'FAILED';
          row.errorMessage = err.response?.data?.message || err.message || 'Unknown error';
          row.resultType = 'FAILED';
          failCount++;
        }
        await this.bulkImportRowRepo.save(row);
        
        job.processedCount++;
        if (job.processedCount % 5 === 0) {
            await this.bulkImportRepo.save(job);
        }
      }

      job.status = 'COMPLETED';
      job.processedCount = successCount + failCount;
      job.completedAt = new Date();
      await this.bulkImportRepo.save(job);
      this.logger.log(`Job ${jobId} Completed. Success: ${successCount}, Fail: ${failCount}`);
    } catch (error: any) {
      this.logger.error(`Critical error in processing job ${jobId}`, error);
      job.status = 'FAILED';
      await this.bulkImportRepo.save(job);
    }
  }
}
