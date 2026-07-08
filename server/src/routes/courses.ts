import { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const coursesRouter = Router();

const COURSE_STATUSES: ReadonlyArray<string> = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function isNotFound(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

coursesRouter.get("/admin", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { enrollments: true } } },
    });
    res.json(courses);
  } catch (err) {
    console.error("courses admin error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

coursesRouter.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        externalUrl: true,
        priceCents: true,
        currency: true,
        certificateEnabled: true,
        certificateIssueMode: true,
        accessType: true,
        accessDays: true,
      },
    });
    res.json(courses);
  } catch (err) {
    console.error("courses list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

coursesRouter.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      imageUrl,
      externalUrl,
      priceCents,
      currency,
      status,
      certificateEnabled,
      certificateIssueMode,
    } = req.body ?? {};

    if (!title || !externalUrl) {
      res.status(400).json({ message: "title and externalUrl are required" });
      return;
    }

    const rawStatus = status ?? "DRAFT";
    if (!COURSE_STATUSES.includes(rawStatus)) {
      res.status(400).json({ message: "Invalid course status" });
      return;
    }

    const data: Prisma.CourseCreateInput = {
      title: String(title),
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      externalUrl: String(externalUrl),
      priceCents: typeof priceCents === "number" ? priceCents : Number(priceCents ?? 0),
      currency: currency ?? "PLN",
      status: rawStatus as Prisma.CourseCreateInput["status"],
      certificateEnabled: Boolean(certificateEnabled),
      certificateIssueMode: certificateIssueMode ?? "manual",
    };

    const course = await prisma.course.create({ data });
    res.status(201).json(course);
  } catch (err) {
    console.error("create course error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

coursesRouter.patch("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? "") : (req.params.id ?? "");
    const body = req.body ?? {};

    const data: Prisma.CourseUpdateInput = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.description !== undefined) data.description = body.description ?? null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ?? null;
    if (body.externalUrl !== undefined) data.externalUrl = String(body.externalUrl);
    if (body.priceCents !== undefined) data.priceCents = Number(body.priceCents);
    if (body.currency !== undefined) data.currency = String(body.currency);
    if (body.certificateEnabled !== undefined) data.certificateEnabled = Boolean(body.certificateEnabled);
    if (body.certificateIssueMode !== undefined) data.certificateIssueMode = String(body.certificateIssueMode);
    if (body.integrationSecretHash !== undefined) data.integrationSecretHash = body.integrationSecretHash ?? null;

    if (body.status !== undefined) {
      if (!COURSE_STATUSES.includes(body.status)) {
        res.status(400).json({ message: "Invalid course status" });
        return;
      }
      data.status = body.status as Prisma.CourseUpdateInput["status"];
    }

    const course = await prisma.course.update({ where: { id }, data });
    res.json(course);
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    console.error("update course error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

coursesRouter.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? "") : (req.params.id ?? "");
    await prisma.course.delete({ where: { id } });
    res.json({ message: "Course deleted" });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    console.error("delete course error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
