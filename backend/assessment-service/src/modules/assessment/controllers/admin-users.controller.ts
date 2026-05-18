import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';
import { AdminUsersService, AdminUsersResponse } from '../services/admin-users.service';
import { BulkAdminUsersService } from '../services/bulk-admin-users.service';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
}

function isMulterFile(obj: unknown): obj is MulterFile {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return 'buffer' in o && Buffer.isBuffer(o.buffer) && 'originalname' in o && typeof o.originalname === 'string';
}

@Controller('admin/users')
@UseGuards(CognitoAuthGuard)
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly bulkAdminUsersService: BulkAdminUsersService,
  ) {}

  @Get()
  async listAdminUsers(
    @Query('q') q?: string,
    @Query('role') role?: 'admin' | 'proctor' | 'student',
    @Query('status') status?: 'active' | 'blocked' | 'pending',
    @Query('tech') tech?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AdminUsersResponse> {
    return this.adminUsersService.listAdminUsers({
      q,
      role,
      status,
      tech: tech === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('bulk/preview')
  @UseInterceptors(FileInterceptor('file'))
  async bulkPreview(@UploadedFile() file: MulterFile) {
    if (!isMulterFile(file)) {
      throw new BadRequestException('File is required');
    }
    // Hardcoded adminId = 1 as per existing pattern or read from request context
    const adminId = 1;
    return this.bulkAdminUsersService.preview(file.buffer, file.originalname, adminId);
  }

  @Post('bulk/execute')
  async bulkExecute(@Body() body: { import_id: string; overrides?: Record<string, any>[] }) {
    return this.bulkAdminUsersService.execute(body.import_id, body.overrides);
  }

  @Get('bulk-jobs/:id')
  async getBulkJobStatus(@Param('id') id: string) {
    return this.bulkAdminUsersService.getJobStatus(id);
  }

  @Get('bulk-jobs/:id/rows')
  async getBulkJobRows(@Param('id') id: string) {
    return this.bulkAdminUsersService.getJobRows(id);
  }
}
