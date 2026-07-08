import { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const logsRouter = Router();

export async function logAccess(
  userId: string,
  courseId: string,
  action: string,
  meta?: Prisma.JsonValue
) {
  return prisma.accessLog.create({
    data: { userId, courseId, action, meta: meta ?? undefined },
  });
}

logsRouter.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 1000) : 100;

    const logs = await prisma.accessLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: true, course: true },
    });

    res.json(logs);
  } catch (err) {
    console.error("logs error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
