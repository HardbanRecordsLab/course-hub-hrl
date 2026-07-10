import { Request, Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const statsRouter = Router();

statsRouter.get("/", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalCourses,
      publishedCourses,
      paidCourses,
      activeEnrollments,
      totalEnrollments,
      totalCertificates,
      recentLogs,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.course.count({ where: { priceCents: { gt: 0 } } }),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.enrollment.count(),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.accessLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, email: true, name: true } }, course: { select: { id: true, title: true } } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: { include: { course: true } } },
      }),
    ]);

    const totalRevenueCents = await prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    });

    res.json({
      users: totalUsers,
      courses: totalCourses,
      publishedCourses,
      paidCourses,
      activeEnrollments,
      totalEnrollments,
      certificatesIssued: totalCertificates,
      totalRevenueCents: totalRevenueCents._sum.total ?? 0,
      recentLogs,
      recentOrders,
    });
  } catch (err) {
    console.error("stats error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
