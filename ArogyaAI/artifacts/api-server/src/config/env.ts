/**
 * Central place that validates required environment variables at startup,
 * so the server fails fast with a clear error instead of crashing deep
 * inside a request handler later.
 */

const required = ["PORT", "DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill it in.`,
    );
  }
}

export const env = {
  port: Number(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  geminiApiKey: process.env.GEMINI_API_KEY,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5000",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
