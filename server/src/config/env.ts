import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/audioai'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  UPLOAD_DIR: z.string().default('./uploads'),
  OUTPUT_DIR: z.string().default('./outputs'),
  // Replicate API (Stable Diffusion)
  REPLICATE_API_TOKEN: z.string().default(''),
  REPLICATE_SD_MODEL: z.string().default('stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750d7579acdf40d2d39bfe9e4d05'),
  REPLICATE_MAX_CONCURRENT: z.string().default('3'),
  // Anthropic / Claude
  ANTHROPIC_API_KEY: z.string().default(''),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  // AI generation tuning
  AI_BEATS_PER_IMAGE: z.string().default('16'),
  AI_SD_STEPS: z.string().default('25'),
  AI_SD_GUIDANCE: z.string().default('7.5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
