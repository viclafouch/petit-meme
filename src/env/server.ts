import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'
import { IS_PRODUCTION } from '~/constants/env'

export const serverEnv = createEnv({
  server: {
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_TWITTER_ID: z.string(),
    AUTH_TWITTER_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32),
    VISITOR_KEY_SALT: z.string().min(32),
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
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .optional()
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})

// `NODE_ENV` says how the code was built, never where it runs: a preview build
// is a production build. Everything that must behave differently on a preview
// than on the live site asks these instead. See docs/adr/0005.
// When the platform says nothing, `NODE_ENV` decides: a missing variable must
// never silently downgrade production.
//
// Functions, not constants: a constant would read `serverEnv` while the module
// loads, and this module travels into client chunks. Reading it there throws,
// and takes hydration down with it.
export const matchIsProductionDeployment = () => {
  return serverEnv.VERCEL_ENV
    ? serverEnv.VERCEL_ENV === 'production'
    : IS_PRODUCTION
}

export const matchIsDeployed = () => {
  return serverEnv.VERCEL_ENV
    ? serverEnv.VERCEL_ENV !== 'development'
    : IS_PRODUCTION
}
