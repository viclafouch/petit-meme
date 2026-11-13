import { z } from 'zod'

const SECRET_MIN_LENGTH = 32
const TOKEN_MIN_LENGTH = 16

export const baseEnvSchema = {
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional()
}

export const serverEnvSchema = {
  DATABASE_URL: z.string(),
  AUTH_DISCORD_ID: z.string(),
  AUTH_DISCORD_SECRET: z.string(),
  AUTH_TWITTER_ID: z.string(),
  AUTH_TWITTER_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string().min(SECRET_MIN_LENGTH),
  VISITOR_KEY_SALT: z.string().min(SECRET_MIN_LENGTH),
  BUNNY_LIBRARY_ID: z.string(),
  BUNNY_ACCESS_KEY: z.string(),
  BUNNY_READ_ONLY_API_KEY: z.string(),
  BUNNY_TOKEN_AUTH_KEY: z.string().min(TOKEN_MIN_LENGTH),
  BUNNY_ORIGINAL_ACCESS_KEY: z.string().min(TOKEN_MIN_LENGTH),
  BUNNY_STORAGE_API_KEY: z.string(),
  BUNNY_STORAGE_ZONE_NAME: z.string(),
  BUNNY_IMAGES_STORAGE_API_KEY: z.string(),
  BUNNY_IMAGES_STORAGE_ZONE_NAME: z.string(),
  ALGOLIA_ADMIN_KEY: z.string(),
  ALGOLIA_SEARCH_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_OVERRIDE_TO: z.string().optional(),
  EMAIL_OVERRIDE_FROM: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_MONTHLY_PRICE_ID: z.string().startsWith('price_'),
  STRIPE_ANNUAL_PRICE_ID: z.string().startsWith('price_'),
  CRON_SECRET: z.string().min(TOKEN_MIN_LENGTH).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_STORE_ID: z.string().optional(),
  BLOB_WEBHOOK_PUBLIC_KEY: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional()
}
