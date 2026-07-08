/**
 * HRL Course Hub — Node.js / Express Middleware
 *
 * Weryfikuje JWT-link (?ch_token=...) dla kursu hostowanego na własnej aplikacji Express.
 * Sprawdza podpis HS256 i datę wygaśnięcia LOKALNIE (bez zapytania do VPS).
 *
 * Użycie:
 *   import express from "express";
 *   import { verifyHrlCourseHubToken } from "./verifiers/node-snippet";
 *
 *   const app = express();
 *   app.use(verifyHrlCourseHubToken({
 *     secret: process.env.HRL_COURSE_JWT_SECRET!, // ten sam co Course.integrationSecretHash
 *     protectedPaths: ["/kurs", "/lekcja"],       // opcjonalnie: lista chronionych ścieżek
 *     frontendUrl: "https://app-course-hub.hardbanrecordslab.online",
 *   }));
 *
 *   // W handlerach masz dostęp do:
 *   // req.chUser = { userId, email, courseId, jti, exp }
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export interface HrlVerifierOptions {
  secret: string;
  protectedPaths?: string[]; // jeśli puste — wszystkie ścieżki chronione
  frontendUrl?: string;
}

export interface ChUser {
  userId: string;
  email: string;
  courseId: string;
  jti: string;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      chUser?: ChUser;
    }
  }
}

export function verifyHrlCourseHubToken(opts: HrlVerifierOptions): RequestHandler {
  const { secret, protectedPaths, frontendUrl = "https://app-course-hub.hardbanrecordslab.online" } = opts;

  if (!secret || secret.length < 32) {
    throw new Error("HRL Course Hub Verifier: secret must be at least 32 characters");
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Sprawdź czy ścieżka jest chroniona
    if (protectedPaths && protectedPaths.length > 0) {
      const matches = protectedPaths.some((p) => req.path.startsWith(p));
      if (!matches) return next();
    }

    const token = (req.query.ch_token as string) || req.cookies?.hrl_chub_token;

    if (!token) {
      return deny(req, res, frontendUrl, "Brak tokenu dostępu. Zaloguj się w HRL Course Hub.");
    }

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as any;

      if (payload.iss && payload.iss !== "HRL Course Hub") {
        return deny(req, res, frontendUrl, "Nieprawidłowy wystawca tokenu.");
      }

      req.chUser = {
        userId: payload.sub,
        email: payload.email,
        courseId: payload.courseId,
        jti: payload.jti,
        exp: payload.exp,
      };

      // Ustaw cookie na 24h (jeśli przyszło z query)
      if (req.query.ch_token) {
        res.cookie("hrl_chub_token", token, {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: req.secure,
          sameSite: "lax",
        });

        // Przekieruj usuwając ?ch_token z URL
        const cleanUrl = req.originalUrl.split("?")[0];
        return res.redirect(cleanUrl);
      }

      next();
    } catch (err: any) {
      const msg = err.name === "TokenExpiredError"
        ? "Token wygasł. Wygeneruj nowy link w portalu HRL Course Hub."
        : "Nieprawidłowy token dostępu.";
      return deny(req, res, frontendUrl, msg);
    }
  };
}

function deny(req: Request, res: Response, frontendUrl: string, message: string) {
  // Dla requestów AJAX/JSON — zwróć 403
  if (req.xhr || req.headers.accept?.includes("application/json") || req.path.startsWith("/api/")) {
    return res.status(403).json({ error: "AccessDenied", message });
  }
  // Dla zwykłych requestów — przekieruj do frontendu
  return res.redirect(`${frontendUrl}/?error=access_denied&msg=${encodeURIComponent(message)}`);
}

/**
 * Opcjonalnie: callback do HRL Course Hub po udanym użyciu linku
 * (do logowania `link_used` w AccessLog)
 *
 * Przykład użycia:
 *   app.get("/kurs/*", verifyHrlCourseHubToken(opts), async (req, res) => {
 *     // ... serwuj treść kursu ...
 *
 *     // Asynchronicznie zaloguj użycie (nie blokuj responsa)
 *     if (req.chUser) {
 *       fetch("https://api.course-hub.hardbanrecordslab.online/api/logs/link-used", {
 *         method: "POST",
 *         headers: { "Content-Type": "application/json" },
 *         body: JSON.stringify({
 *           userId: req.chUser.userId,
 *           courseId: req.chUser.courseId,
 *           jti: req.chUser.jti,
 *         }),
 *       }).catch(() => {}); // nie blokuj na błędach logowania
 *     }
 *   });
 */
