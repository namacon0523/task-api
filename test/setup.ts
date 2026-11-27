// それぞれのテストファイルの前に動く
try {
  process.loadEnvFile(".env");
} catch {
  // .env がなくても続ける（CI では環境変数で渡す）
}

// テストでは、ふだんのデータとは別の「テスト用データベース」を使う
// （テストのたびにデータを全部消すので、ふだんのデータベースを使うと消えてしまう）
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
