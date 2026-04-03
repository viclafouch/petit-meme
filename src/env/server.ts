import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'

export const serverEnv = createEnv({
  server: {
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_TWITTER_ID: z.string(),
    AUTH_TWITTER_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BUNNY_ACCESS_KEY: z.string(),
    BUNNY_COLLECTION_ID: z.string(),
    BUNNY_TOKEN_AUTH_KEY: z.string().min(16),
    BUNNY_STORAGE_API_KEY: z.string(),
    BUNNY_STORAGE_HOSTNAME: z.string(),
    BUNNY_STORAGE_ZONE_NAME: z.string(),
    ALGOLIA_ADMIN_KEY: z.string(),
    ANTHROPIC_API_KEY: z.string(),
    GEMINI_API_KEY: z.string(),
    RESEND_API_KEY: z.string().startsWith('re_'),
    EMAIL_OVERRIDE_TO: z.string().optional(),
    EMAIL_OVERRIDE_FROM: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    STRIPE_MONTHLY_PRICE_ID: z.string().startsWith('price_'),
    STRIPE_ANNUAL_PRICE_ID: z.string().startsWith('price_'),
    CRON_SECRET: z.string().min(16).optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .optional()
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
