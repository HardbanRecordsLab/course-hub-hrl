import { Request, Response, Router } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { checkoutSchema } from "../lib/validate";

export const checkoutRouter = Router();

function isNotFound(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

checkoutRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { courseId } = parsed.data;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    if (course.status !== "PUBLISHED") {
      res.status(400).json({ message: "Course is not available for purchase" });
      return;
    }
    if (course.priceCents <= 0) {
      res.status(400).json({ message: "Course is not purchasable" });
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        status: "PENDING",
        currency: course.currency,
        subtotal: course.priceCents,
        total: course.priceCents,
        items: {
          create: {
            courseId: course.id,
            unitAmount: course.priceCents,
            quantity: 1,
          },
        },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user!.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: course.currency.toLowerCase(),
            unit_amount: course.priceCents,
            product_data: {
              name: course.title,
              description: course.description ?? undefined,
              images: course.imageUrl ? [course.imageUrl] : undefined,
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
        courseId: course.id,
        userId: req.user!.id,
      },
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/cancel`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    console.error("checkout error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
