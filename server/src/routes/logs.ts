import { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { parsePagination } from "../lib/pagination";

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
    const { page, limit, skip } = parsePagination(req.query);
    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: true, course: true },
      }),
      prisma.accessLog.count(),
    ]);
    res.json({ data: logs, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("logs error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
