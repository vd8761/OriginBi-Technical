import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import pool from "../config/db";

const run = async () => {
    const schemaPath = path.resolve(__dirname, "../../../db/schema.sql");
    const sql = readFileSync(schemaPath, "utf8");

    try {
        await pool.query(sql);
        console.log("Database schema applied successfully.");
    } catch (error) {
        console.error("Failed to apply schema:", (error as Error).message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

run();
