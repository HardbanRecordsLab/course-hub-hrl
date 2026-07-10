import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { signSessionToken, requireAuth } from "../middleware/auth";

export const refreshRouter = Router();

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  return process.env.SESSION_JWT_SECRET ?? "hrl_course_hub_session_991823_change_in_production_xyz";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

refreshRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken || typeof refreshToken !== "string") {
      res.status(400).json({ message: "refreshToken is required" });
      return;
    }

    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newRefreshToken = crypto.randomBytes(48).toString("base64url");
    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    const accessToken = jwt.sign(
      {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
        role: stored.user.role,
      },
      getSessionSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
        role: stored.user.role,
      },
    });
  } catch (err) {
    console.error("refresh error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

refreshRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (refreshToken && typeof refreshToken === "string") {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.deleteMany({
        where: { tokenHash, userId: req.user!.id },
      });
    }

    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("logout error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
