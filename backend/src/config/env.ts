import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load .env from the backend directory, then fall back to the repo root so a
// single top-level .env can drive the whole monorepo in development.
loadDotenv();
loadDotenv({ path: '../.env' });

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: csv.default('http://localhost:5173,http://localhost:5174'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Optional. Only needed when the project still signs tokens with the legacy
  // shared secret; asymmetric keys are verified from JWKS instead.
  SUPABASE_JWT_SECRET: z.string().min(20).optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  DEEPLINK_HOST: z.string().default('eastmarket.app'),
  SITE_URL: z.string().url().default('https://eastmarket.app'),
});

export type Env = z.infer<typeof schema>;

function parseEnv(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    // Fail at startup with a readable list rather than at the first request
    // with a confusing undefined.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  }

  const value = parsed.data;

  // The service-role key bypasses every row level security policy in the
  // database. If it is ever equal to the anon key, someone has pasted the
  // wrong value and the whole security model is off.
  if (value.SUPABASE_SERVICE_ROLE_KEY === value.SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is set to the same value as SUPABASE_ANON_KEY. ' +
        'The service-role key bypasses row level security and must be the secret key ' +
        'from Dashboard -> Settings -> API.',
    );
  }

  return value;
}

export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
