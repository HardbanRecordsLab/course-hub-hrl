import { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const usersRouter = Router();

function isNotFound(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

usersRouter.get("/", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { enrollments: true } },
      },
    });
    res.json(users);
  } catch (err) {
    console.error("users list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

usersRouter.patch("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, role, isActive } = req.body ?? {};
    const data: Prisma.UserUpdateInput = {};

    if (name !== undefined) data.name = name ?? null;
    if (role !== undefined) data.role = role as Prisma.UserUpdateInput["role"];
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? "") : (req.params.id ?? "");
    const user = await prisma.user.update({ where: { id }, data });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    console.error("update user error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
