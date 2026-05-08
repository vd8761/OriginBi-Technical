import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS ? String(process.env.DB_PASS) : "",
    database: process.env.DB_NAME || "originbi",
    max: 10,
    idleTimeoutMillis: 30000,
});

export const testConnection = async () => {
    await pool.query("SELECT 1");
};

export default pool;
