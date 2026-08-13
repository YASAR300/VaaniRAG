import { z } from 'zod';

const envSchema = z.object({
  SARVAM_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_API_BASE_URL: z.string().optional().default('https://api.openai.com/v1'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('VaaniRAG'),
});

/**
 * Validates and exports system environment variables.
 */
export function getEnv() {
  const result = envSchema.safeParse({
    SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_BASE_URL: process.env.LLM_API_BASE_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!result.success) {
    console.warn('Environment validation warnings:', result.error.format());
    return envSchema.parse({});
  }

  return result.data;
}

export const env = getEnv();
