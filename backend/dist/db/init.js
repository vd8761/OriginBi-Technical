"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../config/db"));
const run = async () => {
    const schemaPath = path_1.default.resolve(__dirname, "../../db/schema.sql");
    const sql = (0, fs_1.readFileSync)(schemaPath, "utf8");
    try {
        await db_1.default.query(sql);
        console.log("Database schema applied successfully.");
    }
    catch (error) {
        console.error("Failed to apply schema:", error.message);
        process.exit(1);
    }
    finally {
        await db_1.default.end();
    }
};
run();
