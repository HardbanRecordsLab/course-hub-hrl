import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

import { validateEnv } from "./lib/env";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth";
import { coursesRouter } from "./routes/courses";
import { accessRouter } from "./routes/access";
import { certificatesRouter } from "./routes/certificates";
import { checkoutRouter } from "./routes/checkout";
import { webhooksRouter } from "./routes/webhooks";
import { usersRouter } from "./routes/users";
import { logsRouter } from "./routes/logs";
import { statsRouter } from "./routes/stats";
import { refreshRouter } from "./routes/refresh";

const config = validateEnv();

const app = express();

app.set("trust proxy", 1);

if (config.NODE_ENV === "production") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      next();
    } else {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}

const allowedOrigins = (config.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(helmet());
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhooksRouter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  for (const key in req.body) {
    if (typeof req.body[key] === "string") {
      req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
  }
  next();
});

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: config.NODE_ENV,
      database: "connected",
      version: process.env.npm_package_version ?? "1.0.0",
    });
  } catch (err) {
    console.error("health check db error", err);
    res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      env: config.NODE_ENV,
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/access", accessRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/users", usersRouter);
app.use("/api/logs", logsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth/refresh", refreshRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as { message?: string }).message ?? "Internal server error";
  console.error(err);
  res.status(status).json({ message });
});

app.listen(config.PORT, () => {
  console.log(`HRL Course Hub server listening on port ${config.PORT}`);
});
