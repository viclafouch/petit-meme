// See .env.example for documentation on each variable
import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'

export const serverEnv = createEnv({
  server: {
    AUTH_TWITTER_ID: z.string(),
    AUTH_TWITTER_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BUNNY_ACCESS_KEY: z.string(),
    BUNNY_COLLECTION_ID: z.string(),
    ALGOLIA_APP_ID: z.string(),
    ALGOLIA_SECRET: z.string(),
    ALGOLIA_INDEX: z.string(),
    GEMINI_API_KEY: z.string(),
    RESEND_SECRET: z.string().startsWith('re_'),
    RESEND_EMAIL_TO: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    STRIPE_PRICE_ID: z.string().startsWith('price_')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
