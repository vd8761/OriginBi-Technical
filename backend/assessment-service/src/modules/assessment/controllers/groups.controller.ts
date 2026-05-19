import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from '../services/groups.service';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';

@Controller('admin/groups')
@UseGuards(CognitoAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async getGroupsWithStats() {
    return this.groupsService.findAllWithStats();
  }

  @Post()
  async createGroup(@Body() body: any) {
    return this.groupsService.createGroup(body);
  }

  @Patch(':id')
  async updateGroup(@Param('id') id: string, @Body() body: any) {
    return this.groupsService.updateGroup(Number(id), body);
  }

  @Get(':id/members')
  async getGroupMembers(@Param('id') id: string) {
    return this.groupsService.getMembers(Number(id));
  }

  @Delete(':id')
  async deleteGroup(@Param('id') id: string) {
    await this.groupsService.deleteGroup(Number(id));
    return { success: true };
  }
}
