import 'multer';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminQuestionService, ModuleType } from '../services/admin-question.service';
import { R2Service } from '../../r2/r2.service';

@Controller('assessment/admin')
export class AdminQuestionController {
  constructor(
    private readonly adminQuestionService: AdminQuestionService,
    private readonly r2Service: R2Service,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('module') module: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.r2Service.uploadFile(
      file.buffer,
      module || 'general',
      file.originalname,
      file.mimetype,
    );
    return { success: true, ...result };
  }

  @Get('assessments')
  async listAssessments(@Query('module') module?: string) {
    const data = await this.adminQuestionService.listAssessments(module);
    return { data };
  }

  @Put('assessments/:id')
  async updateAssessment(@Param('id') id: string, @Body() body: any) {
    const data = await this.adminQuestionService.updateAssessment(Number(id), body);
    return { message: 'Assessment updated successfully', data };
  }

  // ─── Generic Question Routes ──────────────────────────────────────────────────

  @Get(':module/questions')
  async listQuestions(
    @Param('module') module: ModuleType,
    @Query('assessmentId') assessmentId?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('mode') mode?: string,
  ) {
    const data = await this.adminQuestionService.listQuestions(module, {
      assessmentId: assessmentId ? Number(assessmentId) : undefined,
      category: category || subcategory,
      status,
      search,
      mode,
    });
    return { data, total: data.length };
  }

  @Get(':module/questions/:id')
  async getQuestion(@Param('module') module: ModuleType, @Param('id') id: string) {
    const data = await this.adminQuestionService.getQuestion(module, Number(id));
    return { data };
  }

  @Post(':module/questions')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(@Param('module') module: ModuleType, @Body() body: any) {
    const data = await this.adminQuestionService.createQuestion(module, body);
    return { message: 'Question created', data };
  }

  @Put(':module/questions/:id')
  async updateQuestion(@Param('module') module: ModuleType, @Param('id') id: string, @Body() body: any) {
    const data = await this.adminQuestionService.updateQuestion(module, Number(id), body);
    return { message: 'Question updated', data };
  }

  @Delete(':module/questions')
  async clearQuestions(@Param('module') module: ModuleType, @Query('mode') mode?: string) {
    return await this.adminQuestionService.clearQuestions(module, mode);
  }

  @Delete(':module/questions/:id')
  async deleteQuestion(@Param('module') module: ModuleType, @Param('id') id: string) {
    return await this.adminQuestionService.deleteQuestion(module, Number(id));
  }

  @Post(':module/questions/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkImportQuestions(@Param('module') module: ModuleType, @Body() body: any) {
    const result = await this.adminQuestionService.bulkImportQuestions(module, body);
    return {
      message: `${result.imported} of ${result.total} questions imported`,
      ...result,
    };
  }
}
