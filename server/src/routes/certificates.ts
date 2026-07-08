import { Request, Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const certificatesRouter = Router();

certificatesRouter.get("/", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      include: { user: true, course: true },
    });
    res.json(certificates);
  } catch (err) {
    console.error("certificates list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

certificatesRouter.get("/mine", requireAuth, async (req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      orderBy: { issuedAt: "desc" },
      include: { course: true },
    });
    res.json(certificates);
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
