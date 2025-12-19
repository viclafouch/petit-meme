import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'

export const ENV = createEnv({
  server: {
    AUTH_TWITTER_ID: z.string(),
    AUTH_TWITTER_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BUNNY_ACCESS_KEY: z.string(),
    ALGOLIA_SECRET: z.string(),
    ALGOLIA_INDEX: z.string(),
    GEMINI_API_KEY: z.string(),
    RESEND_SECRET: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PRICE_ID: z.string(),
    BUNNY_LIBRARY_ID: z.string(),
    BUNNY_COLLECTION_ID: z.string(),
    RESEND_EMAIL_TO: z.string().optional()
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_BUNNY_HOSTNAME: z.string()
  },
  runtimeEnv: {
    ...process.env,
    ...import.meta.env
  }
})
