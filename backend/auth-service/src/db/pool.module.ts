import { Global, Module } from '@nestjs/common';
import pool from './pool';

export const PG_POOL = 'PG_POOL';

/**
 * Exposes the single pg Pool for injection. Global so controllers and services
 * do not each have to import a database module.
 */
@Global()
@Module({
  providers: [{ provide: PG_POOL, useValue: pool }],
  exports: [PG_POOL],
})
export class PoolModule {}
