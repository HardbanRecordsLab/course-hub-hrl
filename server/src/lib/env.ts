import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  SESSION_JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Environment variable validation failed");
  }

  _config = result.data;

  if (_config.NODE_ENV === "production") {
    if (!_config.CORS_ORIGIN) {
      throw new Error("CORS_ORIGIN is required in production");
    }
    if (!_config.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is required in production");
    }
  }

  console.log(`✅ Environment validated (${_config.NODE_ENV})`);
  return _config;
}

export function getConfig(): EnvConfig {
  if (!_config) {
    throw new Error("Environment not validated. Call validateEnv() first.");
  }
  return _config;
}
