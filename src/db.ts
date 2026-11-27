import pg from "pg";

// .env があれば読み込む（コンテナの中では、環境変数で直接渡す）
try {
  process.loadEnvFile(".env");
} catch {
  // .env がなくても続ける
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL が設定されていません");
  process.exit(1);
}

// データベースへの接続をまとめて管理する「プール」
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
