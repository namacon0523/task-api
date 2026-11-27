import { app } from "./app.js";

const port = Number(process.env.PORT || 3100);

app.listen(port, () => {
  console.log(`タスク管理API 起動: http://localhost:${port}`);
});
