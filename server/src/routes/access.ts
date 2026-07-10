import { randomUUID } from "node:crypto";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { logAccess } from "./logs";
import { grantAccessSchema } from "../lib/validate";
import { parsePagination } from "../lib/pagination";

export const accessRouter = Router();

interface ActiveCheck {
  status: string;
  accessEndsAt: Date | null;
}

function isActive(enrollment: ActiveCheck): boolean {
  return (
    enrollment.status === "ACTIVE" &&
    (!enrollment.accessEndsAt || enrollment.accessEndsAt.getTime() > Date.now())
  );
}

function isNotFound(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}

accessRouter.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: true, course: true },
      }),
      prisma.enrollment.count(),
    ]);
    res.json({ data: enrollments, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("access list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

accessRouter.get("/mine", requireAuth, async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: req.user!.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { course: true },
      }),
      prisma.enrollment.count({ where: { userId: req.user!.id, status: "ACTIVE" } }),
    ]);
    const active = enrollments.filter(isActive);
    res.json({ data: active, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("access mine error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

accessRouter.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = grantAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { userId, courseId, expiresAt, source } = parsed.data;

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        source: source ?? "admin",
        accessEndsAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await logAccess(userId, courseId, "granted", { source: source ?? "admin" });
    res.status(201).json(enrollment);
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ message: "Enrollment already exists" });
      return;
    }
    console.error("grant access error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

accessRouter.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    await logAccess(enrollment.userId, enrollment.courseId, "revoked");
    res.json(enrollment);
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Enrollment not found" });
      return;
    }
    console.error("revoke access error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

accessRouter.patch("/:id/complete", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    // First, fetch the enrollment with course and user
    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: { course: true, user: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Enrollment not found" });
      return;
    }

    // Mark completion
    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { completedAt: new Date() },
    });

    if (existing.course.certificateEnabled) {
      const studentDisplayName = existing.user.name ?? existing.user.email ?? "Student";
      const courseTitleSnapshot = existing.course.title;
      try {
        await prisma.certificate.create({
          data: {
            userId: existing.userId,
            courseId: existing.courseId,
            studentDisplayName,
            courseTitleSnapshot,
            issuedByUserId: req.user!.id,
          },
        });
        await logAccess(existing.userId, existing.courseId, "certificate_issued", {
          mode: "manual",
        });
      } catch (certErr) {
        if ((certErr as { code?: string }).code !== "P2002") throw certErr;
      }
    }

    res.json(enrollment);
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Enrollment not found" });
      return;
    }
    console.error("complete enrollment error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

accessRouter.post("/:id/generate-link", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!enrollment) {
      res.status(404).json({ message: "Enrollment not found" });
      return;
    }

    if (enrollment.userId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (!isActive(enrollment)) {
      res.status(403).json({ message: "Enrollment is not active" });
      return;
    }

    const course = enrollment.course;
    if (!course.integrationSecretHash) {
      res.status(400).json({ message: "Course has no integration secret configured" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        v: 1,
        iss: "HRL Course Hub",
        sub: enrollment.userId,
        aud: course.externalUrl,
        iat: now,
        exp: now + 60 * 60 * 24,
        jti: randomUUID(),
        email: req.user!.email,
        courseId: course.id,
      },
      course.integrationSecretHash,
      { algorithm: "HS256" }
    );

    const separator = course.externalUrl.includes("?") ? "&" : "?";
    const url = `${course.externalUrl}${separator}ch_token=${token}`;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastLaunchedAt: new Date() },
    });

    res.json({ url, token });
  } catch (err) {
    console.error("generate link error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
