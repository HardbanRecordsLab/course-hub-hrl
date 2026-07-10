import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

import { authRouter } from "./routes/auth";
import { coursesRouter } from "./routes/courses";
import { accessRouter } from "./routes/access";
import { certificatesRouter } from "./routes/certificates";
import { checkoutRouter } from "./routes/checkout";
import { webhooksRouter } from "./routes/webhooks";
import { usersRouter } from "./routes/users";
import { logsRouter } from "./routes/logs";
import { statsRouter } from "./routes/stats";

const app = express();

const PORT = Number(process.env.PORT ?? 3001);
const NODE_ENV = process.env.NODE_ENV ?? "development";
const CORS_ORIGIN = process.env.CORS_ORIGIN;

if (NODE_ENV === "production" && !CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN environment variable is required in production");
}

const allowedOrigins = (CORS_ORIGIN ?? "http://localhost:5173")
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
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/access", accessRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/users", usersRouter);
app.use("/api/logs", logsRouter);
app.use("/api/stats", statsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as { message?: string }).message ?? "Internal server error";
  console.error(err);
  res.status(status).json({ message });
});

app.listen(PORT, () => {
  console.log(`HRL Course Hub server listening on port ${PORT}`);
});
