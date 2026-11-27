import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { pool } from "../src/db.js";

// テストのたびに、テーブルを空にして id を 1 から数え直す
beforeEach(async () => {
  await pool.query("TRUNCATE tasks RESTART IDENTITY");
});

// 全部終わったら、データベースとの接続を閉じる
afterAll(async () => {
  await pool.end();
});

// テスト用にタスクを1件登録する
async function createTask(title: string) {
  const res = await request(app).post("/tasks").send({ title });
  return res.body;
}

describe("GET /health", () => {
  it("DB が動いていれば ok を返す", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok" });
  });
});

describe("POST /tasks（登録）", () => {
  it("タスクを登録できる", async () => {
    const res = await request(app).post("/tasks").send({ title: "牛乳を買う" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: "牛乳を買う", done: false });
  });

  it("前後の空白は取り除いて保存する", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "  レポート  " });
    expect(res.body.title).toBe("レポート");
  });

  it("SQL のような文字列も、ただの文字として保存する", async () => {
    const title = "x'); DROP TABLE tasks;--";
    const res = await request(app).post("/tasks").send({ title });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
  });

  it.each([
    ["空", ""],
    ["空白だけ", "   "],
    ["201文字", "a".repeat(201)],
    ["数字", 123],
    ["なし", undefined],
  ])("title が「%s」なら 400", async (_label, title) => {
    const res = await request(app).post("/tasks").send({ title });
    expect(res.status).toBe(400);
  });

  it("JSON の形が壊れていたら 400", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Content-Type", "application/json")
      .send('{"title":');
    expect(res.status).toBe(400);
  });
});

describe("GET /tasks（一覧）", () => {
  it("登録した順に一覧を返す", async () => {
    await createTask("1つ目");
    await createTask("2つ目");
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body.map((t: { title: string }) => t.title)).toEqual([
      "1つ目",
      "2つ目",
    ]);
  });
});

describe("GET /tasks/:id（1件取得）", () => {
  it("指定したタスクを返す", async () => {
    const task = await createTask("牛乳を買う");
    const res = await request(app).get(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("牛乳を買う");
  });

  it("ないタスクなら 404", async () => {
    const res = await request(app).get("/tasks/999");
    expect(res.status).toBe(404);
  });

  it.each(["abc", "1.5", "0", "-1"])("id が「%s」なら 400", async (id) => {
    const res = await request(app).get(`/tasks/${id}`);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/:id（更新）", () => {
  it("done だけを変えられる", async () => {
    const task = await createTask("牛乳を買う");
    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "牛乳を買う", done: true });
  });

  it("title だけを変えても、done はそのまま", async () => {
    const task = await createTask("牛乳を買う");
    await request(app).patch(`/tasks/${task.id}`).send({ done: true });
    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .send({ title: "牛乳を2本買う" });
    expect(res.body).toMatchObject({ title: "牛乳を2本買う", done: true });
  });

  it("何も指定しなければ 400", async () => {
    const task = await createTask("牛乳を買う");
    const res = await request(app).patch(`/tasks/${task.id}`).send({});
    expect(res.status).toBe(400);
  });

  it("done が true / false 以外なら 400", async () => {
    const task = await createTask("牛乳を買う");
    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .send({ done: "yes" });
    expect(res.status).toBe(400);
  });

  it("ないタスクなら 404", async () => {
    const res = await request(app).patch("/tasks/999").send({ done: true });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /tasks/:id（削除）", () => {
  it("削除すると 204 が返り、その後は見つからない", async () => {
    const task = await createTask("牛乳を買う");
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    const after = await request(app).get(`/tasks/${task.id}`);
    expect(after.status).toBe(404);
  });

  it("ないタスクなら 404", async () => {
    const res = await request(app).delete("/tasks/999");
    expect(res.status).toBe(404);
  });
});

describe("そのほか", () => {
  it("ない URL なら 404", async () => {
    const res = await request(app).get("/nothing");
    expect(res.status).toBe(404);
  });

  it("使っているソフトの名前（X-Powered-By）を返さない", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
