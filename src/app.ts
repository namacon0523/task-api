import express, { type ErrorRequestHandler } from "express";
import { pool } from "./db.js";
import { tasksRouter } from "./tasks.js";

export const app = express();

app.disable("x-powered-by"); // 使っているソフト（Express）を、外に知らせない
app.use(express.json()); // 送られてきた JSON を、req.body で読めるようにする

// サーバーとデータベースが動いているか確かめる
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok" });
  } catch {
    res.status(503).json({ status: "ng", db: "ng" });
  }
});

// /tasks で始まるアクセスは、tasksRouter に任せる
app.use("/tasks", tasksRouter);

// どこにも当てはまらないアクセス
app.use((req, res) => {
  res.status(404).json({ error: "見つかりません" });
});

// エラーをまとめて受け取る（Express 5 では、async の中のエラーもここに来る）
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON の形が正しくありません" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "サーバーでエラーが起きました" });
};
app.use(errorHandler);
