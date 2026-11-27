import { readFileSync } from "node:fs";
import { pool } from "./db.js";

// db/schema.sql を読んで、データベースに実行する（テーブルを作る）
const sql = readFileSync("db/schema.sql", "utf8");
await pool.query(sql);
console.log("✅ テーブルの準備ができました");
await pool.end();
