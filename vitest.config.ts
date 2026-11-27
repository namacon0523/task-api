import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"], // 最初に1回：テスト用DBの準備
    setupFiles: ["./test/setup.ts"], // 各テストファイルの前：テスト用DBに切り替え
    fileParallelism: false, // 同じDBを使うので、テストファイルは1つずつ動かす
  },
});
