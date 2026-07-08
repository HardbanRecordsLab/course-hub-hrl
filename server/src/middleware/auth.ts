import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET ?? "hrl_course_hub_session_991823_change_in_production_xyz";

export function signSessionToken(payload: AuthUser): string {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
    SESSION_JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing or invalid Authorization header" });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    const decoded = jwt.verify(token, SESSION_JWT_SECRET) as jwt.JwtPayload;

    if (
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"
    ) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: typeof decoded.name === "string" ? decoded.name : null,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden: admin access required" });
    return;
  }
  next();
}
