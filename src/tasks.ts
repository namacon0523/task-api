import { Router } from "express";
import { pool } from "./db.js";

export const tasksRouter = Router();

// id が「1以上の整数」なら数字を、そうでなければ null を返す
function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- 入力のチェック ----------
// title が「1〜200文字の文字列」か確かめる
function isValidTitle(title: unknown): title is string {
  return (
    typeof title === "string" &&
    title.trim().length > 0 &&
    title.trim().length <= 200
  );
}

// ---------- 一覧：GET /tasks ----------
tasksRouter.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM tasks ORDER BY id");
  res.json(result.rows);
});

// ---------- 登録：POST /tasks ----------
tasksRouter.post("/", async (req, res) => {
  const { title } = req.body ?? {};
  if (!isValidTitle(title)) {
    res.status(400).json({ error: "title は1〜200文字で指定してください" });
    return;
  }
  const result = await pool.query(
    "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
    [title.trim()],
  );
  res.status(201).json(result.rows[0]);
});

// ---------- 1件取得：GET /tasks/:id ----------
tasksRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "id は1以上の整数で指定してください" });
    return;
  }
  const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }
  res.json(result.rows[0]);
});

// ---------- 更新：PATCH /tasks/:id ----------
tasksRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "id は1以上の整数で指定してください" });
    return;
  }
  const { title, done } = req.body ?? {};
  if (title === undefined && done === undefined) {
    res
      .status(400)
      .json({ error: "title か done のどちらかを指定してください" });
    return;
  }
  if (title !== undefined && !isValidTitle(title)) {
    res.status(400).json({ error: "title は1〜200文字で指定してください" });
    return;
  }
  if (done !== undefined && typeof done !== "boolean") {
    res.status(400).json({ error: "done は true か false で指定してください" });
    return;
  }
  // 指定されなかった項目（null）は、今の値のまま（COALESCE）
  const result = await pool.query(
    `UPDATE tasks
        SET title = COALESCE($1, title),
            done = COALESCE($2, done),
            updated_at = NOW()
      WHERE id = $3
      RETURNING *`,
    [title?.trim() ?? null, done ?? null, id],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }
  res.json(result.rows[0]);
});

// ---------- 削除：DELETE /tasks/:id ----------
tasksRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "id は1以上の整数で指定してください" });
    return;
  }
  const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }
  res.status(204).end();
});
