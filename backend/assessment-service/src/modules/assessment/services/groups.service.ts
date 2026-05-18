import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TechGroup } from '../../../entities/TechGroup';

@Injectable()
export class GroupsService implements OnModuleInit {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(TechGroup)
    private readonly techGroupsRepo: Repository<TechGroup>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing tech_groups database table if not exists...');
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS tech_groups (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      this.logger.log('tech_groups database table ensured.');
    } catch (err: any) {
      this.logger.error(`Failed to ensure tech_groups table: ${err.message}`);
    }
  }

  async findAllWithStats(): Promise<any[]> {
    const rawGroups = await this.techGroupsRepo.query(`
      SELECT 
        g.id::text as id,
        g.code,
        g.name,
        g.metadata as "groupMetadata",
        g.is_active as "isActive",
        (SELECT COUNT(r.id)::int FROM registrations r WHERE r.metadata->>'groupName' = g.name AND r.is_deleted = false) as "candidateCount"
      FROM tech_groups g
      WHERE g.is_deleted = false
      ORDER BY g.created_at DESC;
    `);

    return rawGroups.map((g: any) => {
      const meta = g.groupMetadata || {};
      return {
        id: g.id,
        code: g.code,
        name: g.name,
        isActive: g.isActive,
        candidateCount: g.candidateCount,
        assessments: meta.assessments || [],
      };
    });
  }

  async createGroup(body: any): Promise<any> {
    const name = body.name?.trim();
    if (!name) {
      throw new Error('Group name is required');
    }

    // Auto-generate code: strip all non-alphanumeric characters to make a single clean uppercase word
    const code = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GROUP';

    const isFree = body.pricing?.isFree === true || body.isFree === true;
    const assessments = body.assessments || [];

    const metadata = {
      description: body.description || '',
      status: body.status || 'active',
      isFree,
      assessments,
      proctoring: body.proctoring || {
        fullScreenLock: true,
        tabSwitchLimit: 3,
        webcamProctoring: true,
      },
    };

    const newGroup = this.techGroupsRepo.create({
      code,
      name,
      metadata,
      isActive: body.status === 'active',
      isDeleted: false,
    });

    return await this.techGroupsRepo.save(newGroup);
  }

  async updateGroup(id: number, body: any): Promise<any> {
    const group = await this.techGroupsRepo.findOne({ where: { id, isDeleted: false } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Explicitly do not allow updating group.code to keep it immutable
    if (body.name !== undefined) group.name = body.name?.trim();

    const currentMeta = group.metadata || {};
    const isFree = body.pricing?.isFree !== undefined ? body.pricing.isFree === true : (currentMeta.isFree === true);
    const assessments = body.assessments !== undefined ? body.assessments : (currentMeta.assessments || []);

    group.metadata = {
      ...currentMeta,
      description: body.description !== undefined ? body.description : currentMeta.description || '',
      status: body.status !== undefined ? body.status : currentMeta.status || 'active',
      isFree,
      assessments,
      proctoring: body.proctoring !== undefined ? body.proctoring : currentMeta.proctoring || {
        fullScreenLock: true,
        tabSwitchLimit: 3,
        webcamProctoring: true,
      },
    };

    if (body.status !== undefined) {
      group.isActive = body.status === 'active';
    }

    return await this.techGroupsRepo.save(group);
  }

  async getMembers(groupId: number): Promise<any[]> {
    const group = await this.techGroupsRepo.findOne({ where: { id: groupId, isDeleted: false } as any });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.techGroupsRepo.query(`
      SELECT r.id::text as id, r.full_name as "fullName", u.email, 'registered' as status, r.created_at as "createdAt"
      FROM registrations r
      JOIN users u ON u.id = r.user_id
      WHERE r.metadata->>'groupName' = $1 AND r.is_deleted = false
    `, [group.name]);
  }

  async deleteGroup(id: number): Promise<void> {
    const group = await this.techGroupsRepo.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    group.isDeleted = true;
    await this.techGroupsRepo.save(group);
  }
}
