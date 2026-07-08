import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { logAccess } from "./logs";

export const webhooksRouter = Router();

webhooksRouter.post("/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ message: "STRIPE_WEBHOOK_SECRET is not configured" });
    return;
  }
  if (!sig) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    res.status(400).json({
      message: `Webhook signature verification failed: ${(err as Error).message}`,
    });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { orderId, courseId, userId } = session.metadata ?? {};

      if (!orderId || !courseId || !userId) {
        res.json({ received: true, warning: "Missing metadata in session" });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
        },
      });

      const course = await prisma.course.findUnique({ where: { id: courseId } });

      let accessEndsAt: Date | null = null;
      if (course) {
        if (course.accessType === "FIXED_DAYS" && course.accessDays) {
          accessEndsAt = new Date(Date.now() + course.accessDays * 24 * 60 * 60 * 1000);
        } else if (course.accessType === "DATE_RANGE" && course.accessEndAt) {
          accessEndsAt = course.accessEndAt;
        }
      }

      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: { status: "ACTIVE", orderId, accessEndsAt, accessStartsAt: new Date() },
        create: {
          userId,
          courseId,
          orderId,
          status: "ACTIVE",
          accessEndsAt,
          source: "purchase",
        },
      });

      await logAccess(userId, courseId, "granted", {
        source: "purchase",
        orderId,
        sessionId: session.id,
      });

      if (course && course.certificateEnabled && course.certificateIssueMode === "on_purchase") {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        try {
          await prisma.certificate.create({
            data: {
              userId,
              courseId,
              studentDisplayName: user?.name ?? user?.email ?? "Student",
              courseTitleSnapshot: course.title,
              issuedByUserId: null,
            },
          });
          await logAccess(userId, courseId, "certificate_issued", {
            mode: "on_purchase",
            orderId,
          });
        } catch (certErr) {
          if ((certErr as { code?: string }).code !== "P2002") throw certErr;
        }
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null;

      if (paymentIntentId) {
        const order = await prisma.order.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "REFUNDED" },
          });

          const enrollment = await prisma.enrollment.findFirst({
            where: { orderId: order.id },
          });

          if (enrollment) {
            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { status: "REVOKED" },
            });
            await logAccess(enrollment.userId, enrollment.courseId, "revoked", {
              reason: "refund",
              orderId: order.id,
            });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("webhook handling error", err);
    res.status(500).json({ message: "Webhook handler failed" });
  }
});
