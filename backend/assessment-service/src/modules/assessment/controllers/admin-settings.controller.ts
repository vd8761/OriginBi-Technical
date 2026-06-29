import { Controller, Get, Put, Body, OnModuleInit, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';

@Controller('admin/settings')
@UseGuards(CognitoAuthGuard)
export class AdminSettingsController implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`
        CREATE TABLE IF NOT EXISTS global_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `);
    } catch (e: any) {
      console.error('Failed to initialize global_settings table:', e.message);
    } finally {
      await qr.release();
    }
  }

  @Get()
  async getAllSettings() {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const rows = await qr.query('SELECT key, value FROM global_settings');
      const settings: Record<string, any> = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return settings;
    } finally {
      await qr.release();
    }
  }

  @Put()
  async saveAllSettings(@Body() body: Record<string, any>) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      for (const [key, value] of Object.entries(body)) {
        await qr.query(`
          INSERT INTO global_settings (key, value, updated_at)
          VALUES ($1, $2, now())
          ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = now()
        `, [key, JSON.stringify(value)]);
      }
      return { success: true };
    } finally {
      await qr.release();
    }
  }
}
