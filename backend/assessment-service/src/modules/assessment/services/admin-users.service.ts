import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AdminUserRow {
  id: number;
  email: string;
  fullName: string;
  role: string;
  roleGroup: 'Admin' | 'Proctor' | 'Student';
  status: 'active' | 'blocked' | 'pending';
  institutionName: string;
  assessments: number;
  lastSeenAt: string | null;
  createdAt: string | null;
  mobileNumber: string;
  designation: string;
  schoolLevel: string;
  schoolStream: string;
  studentBoard: string;
  departmentName: string;
  degreeName: string;
  currentYear: string;
  groupName?: string;
  countryCode?: string;
}

export interface AdminUserCounts {
  total: number;
  students: number;
  admins: number;
  proctors: number;
  blocked: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
  counts: AdminUserCounts;
}

export interface ListAdminUsersParams {
  q?: string;
  role?: 'admin' | 'proctor' | 'student';
  status?: 'active' | 'blocked' | 'pending';
  tech?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private dataSource: DataSource) {}

  async listAdminUsers(params: ListAdminUsersParams): Promise<AdminUsersResponse> {
    const limit = Math.min(params.limit || 10, 200);
    const offset = params.offset || 0;
    const q = params.q?.trim() || '';
    const roleGroup = params.role?.toLowerCase() || '';
    const status = params.status?.toLowerCase() || '';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const args: any[] = [];
      const where: string[] = [];

      // Mandatory tech assessment filter
      where.push('r.is_tech_assessment IN (1, 2)');

      if (q) {
        const p = args.length + 1;
        args.push(`%${q}%`);
        where.push(`(u.email ILIKE $${p} OR COALESCE(r.full_name, '') ILIKE $${p})`);
      }

      switch (roleGroup) {
        case 'admin':
          where.push("u.role IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')");
          break;
        case 'proctor':
          where.push("u.role = 'PROCTOR'");
          break;
        case 'student':
          where.push("u.role NOT IN ('ADMIN', 'SUPER_ADMIN', 'STAFF', 'PROCTOR') OR u.role IS NULL");
          break;
      }

      switch (status) {
        case 'blocked':
          where.push('u.is_blocked = TRUE');
          break;
        case 'pending':
          where.push('u.is_blocked = FALSE AND u.is_active = FALSE');
          break;
        case 'active':
          where.push('u.is_blocked = FALSE AND u.is_active = TRUE');
          break;
      }

      const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      this.logger.debug(`listAdminUsers whereSQL: ${whereSQL}`);
      this.logger.debug(`listAdminUsers args: ${JSON.stringify(args)}`);

      // 1. Get counts
      const countsResult = await queryRunner.query(`
        SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE u.role NOT IN ('ADMIN','SUPER_ADMIN','STAFF','PROCTOR') OR u.role IS NULL)::bigint AS students,
            COUNT(*) FILTER (WHERE u.role IN ('ADMIN','SUPER_ADMIN','STAFF'))::bigint AS admins,
            COUNT(*) FILTER (WHERE u.role = 'PROCTOR')::bigint AS proctors,
            COUNT(*) FILTER (WHERE u.is_blocked = TRUE)::bigint AS blocked
        FROM users u
        LEFT JOIN registrations r ON r.user_id = u.id
        WHERE r.is_tech_assessment IN (1, 2)
      `);
      const countsRaw = countsResult[0];
      this.logger.debug(`listAdminUsers countsRaw: ${JSON.stringify(countsRaw)}`);
      const counts: AdminUserCounts = {
        total: Number(countsRaw.total),
        students: Number(countsRaw.students),
        admins: Number(countsRaw.admins),
        proctors: Number(countsRaw.proctors),
        blocked: Number(countsRaw.blocked),
      };

      // 2. Get total matching rows
      const totalResult = await queryRunner.query(`
        SELECT COUNT(*)::bigint as total
        FROM users u
        LEFT JOIN registrations r ON r.user_id = u.id
        ${whereSQL}
      `, args);
      const total = Number(totalResult[0]?.total || 0);
      this.logger.debug(`listAdminUsers total matching: ${total}`);

      // 3. Get rows
      const rowsSQL = `
        SELECT u.id,
               COALESCE(u.email, '') as email,
               COALESCE(r.full_name, '') as full_name,
               COALESCE(u.role, '') AS role,
               COALESCE(r.mobile_number, '') as mobile_number, COALESCE(r.country_code, '+91') as country_code,
               COALESCE(p.name, '') as designation,
               COALESCE(r.school_level, '') as school_level,
               COALESCE(r.school_stream, '') as school_stream,
               COALESCE(r.student_board, '') as student_board,
               COALESCE(r.metadata->>'groupName', '') as group_name,
               COALESCE(dept.name, (SELECT name FROM departments WHERE id = NULLIF(r.metadata->>'departmentId', '')::bigint), '') as department_name,
               COALESCE(deg.name, (SELECT name FROM degree_types WHERE id = NULLIF(r.metadata->>'degreeTypeId', '')::bigint), '') as degree_name,
               COALESCE(r.metadata->>'currentYear', r.metadata->>'current_year', '') as current_year,
               COALESCE(
                   r.metadata->>'institutionName',
                   r.metadata->>'institution_name',
                   ''
               ) AS institution,
               u.is_active,
               u.is_blocked,
               u.last_login_at,
               u.created_at,
               (SELECT COUNT(*)::bigint FROM attempts a WHERE a.candidate_user_id = u.id) AS assessments
        FROM users u
        LEFT JOIN registrations r ON r.user_id = u.id
        LEFT JOIN programs p ON p.id = r.program_id
        LEFT JOIN department_degrees dd ON dd.id = r.department_degree_id
        LEFT JOIN departments dept ON dept.id = dd.department_id
        LEFT JOIN degree_types deg ON deg.id = dd.degree_type_id
        ${whereSQL}
        ORDER BY u.created_at DESC NULLS LAST, u.id DESC
        LIMIT $${args.length + 1} OFFSET $${args.length + 2}
      `;
      const finalArgs = [...args, limit, offset];
      const rowsRaw = await queryRunner.query(rowsSQL, finalArgs);

      const users: AdminUserRow[] = rowsRaw.map((row: any) => {
        let roleGroupRes: 'Admin' | 'Proctor' | 'Student' = 'Student';
        const rRaw = (row.role || '').toUpperCase().trim();
        if (['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(rRaw)) roleGroupRes = 'Admin';
        else if (rRaw === 'PROCTOR') roleGroupRes = 'Proctor';

        let statusRes: 'active' | 'blocked' | 'pending' = 'active';
        if (row.is_blocked) statusRes = 'blocked';
        else if (!row.is_active) statusRes = 'pending';

        return {
          id: Number(row.id),
          email: row.email,
          fullName: row.full_name,
          role: row.role,
          roleGroup: roleGroupRes,
          status: statusRes,
          institutionName: row.institution,
          assessments: Number(row.assessments),
          lastSeenAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
          mobileNumber: row.mobile_number,
          designation: row.designation,
          schoolLevel: row.school_level,
          schoolStream: row.school_stream,
          studentBoard: row.student_board,
          departmentName: row.department_name,
          degreeName: row.degree_name,
          currentYear: row.current_year,
          groupName: row.group_name || undefined, countryCode: row.country_code || undefined,
        };
      });

      return {
        users,
        total,
        limit,
        offset,
        counts,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
