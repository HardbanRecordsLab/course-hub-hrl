import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, signSessionToken } from "../middleware/auth";
import { authLimiter, registerLimiter, speedLimiter } from "../middleware/rateLimit";
import { loginSchema, registerSchema } from "../lib/validate";
import { sendWelcomeEmail } from "../lib/email";

export const authRouter = Router();

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  return process.env.SESSION_JWT_SECRET ?? "hrl_course_hub_session_991823_change_in_production_xyz";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return raw;
}

authRouter.post("/register", registerLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { email, password, name } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: "User with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name: name ?? null },
    });

    const token = signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await createRefreshToken(user.id);

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    sendWelcomeEmail(user.email, user.name).catch(() => {});
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/login", authLimiter, speedLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is disabled" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await createRefreshToken(user.id);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error("me error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
