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

    const seenEmails = new Set<string>();
    const seenMobiles = new Set<string>();

    const preparedRows = rawRows.map((row, idx) => {
      const email = this.normalizeEmail(row['Email'] || row['email']);
      const name = row['Name'] || row['name'] || row['FullName'] || row['full_name'];
      let mobile = this.normalizeMobile(row['Mobile'] || row['mobile'] || row['mobile_number']);
      const cCodeRaw = String(row['CountryCode'] || row['country_code'] || '').replace(/\D/g, '');
      if (cCodeRaw && mobile.startsWith(cCodeRaw)) {
        mobile = mobile.substring(cCodeRaw.length);
      } else if (mobile.length > 10 && mobile.startsWith('91')) {
        mobile = mobile.substring(2);
      }
      const roleRaw = String(row['Role'] || row['role'] || 'STUDENT').toUpperCase();
      
      let role = 'STUDENT';
      if (['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(roleRaw)) role = 'ADMIN';
      else if (roleRaw === 'PROCTOR') role = 'PROCTOR';

      let pCode = row['ProgramId'] || row['program_code'];
      if (!pCode) {
        const hasCollegeField = 
          row['DepartmentId'] || row['department_degree'] || row['department'] || row['department_degree_id'] ||
          row['Degree'] || row['degree'] ||
          row['CurrentYear'] || row['current_year'] || row['Year'] || row['year'];
          
        const hasEmployeeField =
          row['CurrentRole'] || row['current_role'] || row['Current Role'] || row['currentRole'] ||
          row['RoleDescription'] || row['role_description'] || row['Role Description'] || row['roleDescription'];
          
        if (hasCollegeField) {
          pCode = 'COLLEGE_STUDENT';
        } else if (hasEmployeeField) {
          pCode = 'EMPLOYEE';
        } else {
          pCode = 'SCHOOL_STUDENT';
        }
      }
      const isCollege = String(pCode).toUpperCase().includes('COLLEGE');
      const isSchool = String(pCode).toUpperCase().includes('SCHOOL');

      const dto = {
        email,
        name,
        fullName: name,
        mobile,
        mobileNumber: mobile,
        role,
        gender: row['Gender'] || row['gender'] || 'Male',
        countryCode: row['CountryCode'] || row['country_code'] || '+91',
        programCode: pCode,
        schoolLevel: isSchool ? (row['SchoolLevel'] || row['school_level']) : undefined,
        schoolStream: isSchool ? (row['SchoolStream'] || row['school_stream']) : undefined,
        studentBoard: isSchool ? (row['StudentBoard'] || row['student_board'] || row['board']) : undefined,
        departmentDegreeId: isCollege ? (row['DepartmentId'] || row['department_degree'] || row['department'] || row['department_degree_id']) : undefined,
        currentYear: isCollege ? (row['CurrentYear'] || row['current_year'] || row['Year'] || row['year']) : undefined,
        currentRole: row['CurrentRole'] || row['current_role'] || row['Current Role'] || row['currentRole'],
        roleDescription: row['RoleDescription'] || row['role_description'] || row['Role Description'] || row['roleDescription'],
        password: row['Password'] || row['password'] || 'TempPassword123!',
        groupName: row['GroupName'] || row['group_name'] || row['Group'] || row['group'] || '',
        sendEmail: (() => {
          const val = row['SendEmail'] || row['send_email'];
          return val ? String(val).toUpperCase() === 'TRUE' : false;
        })(),
      };

      let isValid = email.length > 0;
      let errorMessage = isValid ? null : 'Missing required fields (Email)';

      if (isValid) {
        if (seenEmails.has(email)) {
          isValid = false;
          errorMessage = 'Duplicate email address within the uploaded file.';
        } else if (mobile && seenMobiles.has(mobile)) {
          isValid = false;
          errorMessage = 'Duplicate mobile number within the uploaded file.';
        } else {
          seenEmails.add(email);
          if (mobile) seenMobiles.add(mobile);
        }
      }

      return { row, dto, isValid, errorMessage, index: idx };
    });

    // Check external duplicates concurrently
    await Promise.all(
      preparedRows.map(async (pRow) => {
        if (!pRow.isValid) return;

        try {
          const check = await this.registrationService.validateRegistration(
            pRow.dto.email,
            pRow.dto.mobile || undefined,
          );
          if (!check.isValid) {
            pRow.isValid = false;
            pRow.errorMessage = check.message;
          }
        } catch (err: any) {
          this.logger.warn(`External validation failed for ${pRow.dto.email}: ${err.message}`);
        }
      })
    );

    for (const pRow of preparedRows) {
      if (pRow.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      rowsToInsert.push(this.bulkImportRowRepo.create({
        importId: importJob.id,
        rowIndex: pRow.index + 1,
        rawData: pRow.row,
        normalizedData: pRow.dto,
        status: pRow.isValid ? 'READY' : 'INVALID',
        resultType: pRow.isValid ? null : 'INVALID_DATA',
        errorMessage: pRow.errorMessage,
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
      rows: rowsToInsert.map((r: BulkImportRowEntity) => ({ ...r, import: undefined })),
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
          
          await this.registrationService.registerUser({
            email: dto.email,
            password: dto.password || 'TempPassword123!',
            fullName: dto.fullName || dto.name,
            gender: String(dto.gender || 'MALE').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
            mobileNumber: dto.mobileNumber || dto.mobile || '',
            countryCode: dto.countryCode || '+91',
            sendEmail: dto.sendEmail || false,
            programCode: dto.programCode,
            schoolLevel: dto.schoolLevel,
            schoolStream: dto.schoolStream,
            studentBoard: dto.studentBoard,
            departmentDegreeId: dto.departmentDegreeId,
            currentYear: dto.currentYear,
            currentRole: dto.currentRole,
            roleDescription: dto.roleDescription,
            groupName: dto.groupName,
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
