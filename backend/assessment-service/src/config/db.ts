import * as dotenv from "dotenv";
import { Pool } from "pg";

// Load .env.local first (preferred), fall back to .env for compatibility.
dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS ? String(process.env.DB_PASS) : "postgres",
    database: process.env.DB_NAME || "obidatanew",
    max: 10,
    idleTimeoutMillis: 30000,
});

export const testConnection = async () => {
    await pool.query("SELECT 1");
};

export default pool;
