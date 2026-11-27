import { readFileSync } from "node:fs";
import pg from "pg";

// テスト全体の前に1回だけ動く：テスト用のデータベースとテーブルを用意する
export default async function setup() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // .env がなくても続ける（CI では環境変数で渡す）
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL が設定されていません");
  }
  const dbName = new URL(url).pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(
      "テスト用データベースの名前は、英小文字・数字・_ だけにしてください",
    );
  }

  // ① テスト用のデータベースがなければ作る（管理用の postgres データベースにつないで作る）
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${dbName}`);
  }
  await admin.end();

  // ② テスト用のデータベースに、テーブルを作る
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(readFileSync("db/schema.sql", "utf8"));
  await client.end();
}
