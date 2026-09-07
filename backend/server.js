import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
const app = express();
const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3042);
if (host !== "127.0.0.1" && host !== "::1")
  throw new Error("HOST 必须为回环地址：127.0.0.1 或 ::1");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT 无效");
if (!existsSync(path.join(dist, "index.html")))
  throw new Error("缺少 dist/index.html，请先执行 npm run build");
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, project: "VisualizeAlgorithm" }),
);
app.use("/api", (_req, res) => res.status(404).json({ error: "接口不存在" }));
app.use(
  "/assets",
  express.static(path.join(dist, "assets"), { immutable: true, maxAge: "1y" }),
);
app.use(express.static(dist, { maxAge: 0 }));
app.use((_req, res) => res.status(404).send("页面不存在"));
const server = app.listen(port, host, () =>
  console.log(`VisualizeAlgorithm running at http://${host}:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
