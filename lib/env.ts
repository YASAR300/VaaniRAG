import { z } from "zod";

const envSchema = z.object({
  SARVAM_API_KEY: z.string().min(1).optional(), // TODO(Phase 3): make required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(), // TODO(Phase 5): make required
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(), // TODO(Phase 5): make required
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), // TODO(Phase 5): make required
  LLM_API_KEY: z.string().min(1).optional(), // TODO(Phase 6): make required
  LLM_API_BASE_URL: z.string().url().optional(), // TODO(Phase 6): make required
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("VaaniRAG"),
});

export const env = envSchema.parse(process.env);
