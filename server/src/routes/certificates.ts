import { Request, Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { parsePagination } from "../lib/pagination";

export const certificatesRouter = Router();

certificatesRouter.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
        include: { user: true, course: true },
      }),
      prisma.certificate.count(),
    ]);
    res.json({ data: certificates, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("certificates list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

certificatesRouter.get("/mine", requireAuth, async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where: { userId: req.user!.id, revokedAt: null },
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
        include: { course: true },
      }),
      prisma.certificate.count({ where: { userId: req.user!.id, revokedAt: null } }),
    ]);
    res.json({ data: certificates, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("certificates mine error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

certificatesRouter.get("/verify/:code", async (req: Request, res: Response) => {
  try {
    const code = Array.isArray(req.params.code) ? (req.params.code[0] ?? "") : (req.params.code ?? "");
    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode: code },
    });

    if (!certificate) {
      res.status(404).json({ isValid: false, message: "Certificate not found" });
      return;
    }

    if (certificate.revokedAt) {
      res.status(404).json({ isValid: false, message: "Certificate has been revoked" });
      return;
    }

    res.json({
      isValid: true,
      studentName: certificate.studentDisplayName,
      courseTitle: certificate.courseTitleSnapshot,
      issuedAt: certificate.issuedAt,
    });
  } catch (err) {
    console.error("certificate verify error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

certificatesRouter.patch("/:id/revoke", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? "") : (req.params.id ?? "");
    if (!id) {
      res.status(400).json({ message: "Invalid certificate id" });
      return;
    }

    const certificate = await prisma.certificate.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    res.json({ message: "Certificate revoked", certificate });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ message: "Certificate not found" });
      return;
    }
    console.error("certificate revoke error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
