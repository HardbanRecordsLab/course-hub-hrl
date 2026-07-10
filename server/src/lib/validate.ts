import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().min(5).max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32),
});

export const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  externalUrl: z.string().url(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  certificateEnabled: z.boolean().optional(),
  certificateIssueMode: z.enum(["manual", "on_purchase"]).optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  certificateEnabled: z.boolean().optional(),
  certificateIssueMode: z.enum(["manual", "on_purchase"]).optional(),
  integrationSecretHash: z.string().optional(),
});

export const grantAccessSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  expiresAt: z.string().optional(),
  source: z.string().optional(),
});

export const checkoutSchema = z.object({
  courseId: z.string().min(1),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["ADMIN", "STUDENT"]).optional(),
  isActive: z.boolean().optional(),
});
