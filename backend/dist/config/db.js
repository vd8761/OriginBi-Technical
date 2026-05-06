"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = void 0;
require("dotenv/config");
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS ? String(process.env.DB_PASS) : "",
    database: process.env.DB_NAME || "originbi",
    max: 10,
    idleTimeoutMillis: 30000,
});
const testConnection = async () => {
    await pool.query("SELECT 1");
};
exports.testConnection = testConnection;
exports.default = pool;
