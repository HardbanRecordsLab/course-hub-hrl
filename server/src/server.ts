import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import { authRouter } from "./routes/auth";
import { coursesRouter } from "./routes/courses";
import { accessRouter } from "./routes/access";
import { certificatesRouter } from "./routes/certificates";
import { checkoutRouter } from "./routes/checkout";
import { webhooksRouter } from "./routes/webhooks";
import { usersRouter } from "./routes/users";
import { logsRouter } from "./routes/logs";

const app = express();

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const allowedOrigins = CORS_ORIGIN.split(",").map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || CORS_ORIGIN === "*") {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

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
