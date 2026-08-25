import { Pool } from 'pg';

/**
 * The one connection pool for this service. Points at `originbi_technical` —
 * the same database the other three backends use. `users.id` here is NOT the
 * same id the sibling `originbi` platform assigns to the same person; identity
 * across platforms is resolved by Cognito `sub` or email only.
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS ? String(process.env.DB_PASS) : 'postgres',
  database: process.env.DB_NAME || 'originbi_technical',
  max: 10,
  idleTimeoutMillis: 30_000,
  // A managed Postgres on another host terminates plaintext connections.
  ssl:
    process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)
      ? { rejectUnauthorized: false }
      : false,
});

export default pool;
