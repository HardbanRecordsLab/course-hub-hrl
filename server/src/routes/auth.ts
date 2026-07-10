import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, signSessionToken } from "../middleware/auth";
import { authLimiter, registerLimiter, speedLimiter } from "../middleware/rateLimit";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "../lib/validate";
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerification } from "../lib/email";
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } from "../lib/accountLockout";

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

    const emailVerificationToken = crypto.randomBytes(32).toString("base64url");
    const emailVerificationTokenHash = hashToken(emailVerificationToken);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name ?? null,
        emailVerificationToken: emailVerificationTokenHash,
      },
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

    const frontendUrl = process.env.FRONTEND_URL ?? "https://app-course-hub.hardbanrecordslab.online";
    const verificationLink = `${frontendUrl}/verify-email?token=${emailVerificationToken}`;

    sendWelcomeEmail(user.email, user.name).catch(() => {});
    sendEmailVerification(user.email, user.name, verificationLink).catch(() => {});
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
    const clientIp = (req.headers["x-forwarded-for"] as string ?? req.socket.remoteAddress ?? "unknown").toString();

    const lockout = checkAccountLockout(normalizedEmail, clientIp);
    if (lockout.locked) {
      res.status(429).json({
        message: `Account temporarily locked. Try again in ${Math.ceil((lockout.retryAfterMs ?? 0) / 60000)} minutes.`,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      recordFailedAttempt(normalizedEmail, clientIp);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is disabled" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(normalizedEmail, clientIp);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    clearFailedAttempts(normalizedEmail, clientIp);

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
        emailVerified: true,
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

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.json({ message: "If the email exists, a reset link has been sent." });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("base64url");
    const resetTokenHash = hashToken(resetToken);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetTokenHash, passwordResetExpires: resetExpires },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "https://app-course-hub.hardbanrecordslab.online";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    sendPasswordResetEmail(user.email, user.name, resetLink).catch(() => {});

    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgot-password error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("reset-password error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const { token } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: hashToken(token) },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid verification token" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null },
    });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("verify-email error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
