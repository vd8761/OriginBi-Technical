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
import { Roles } from '../../../auth/roles.decorator';

@Controller('admin/groups')
@Roles('ADMIN')
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

  @Post(':id/members')
  async addGroupMember(@Param('id') id: string, @Body() body: { email: string }) {
    return this.groupsService.addMember(Number(id), body.email);
  }

  @Delete(':id/members/:memberId')
  async removeGroupMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.groupsService.removeMember(Number(id), memberId);
  }

  @Delete(':id')
  async deleteGroup(@Param('id') id: string) {
    await this.groupsService.deleteGroup(Number(id));
    return { success: true };
  }
}
