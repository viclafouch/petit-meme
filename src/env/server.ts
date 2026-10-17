import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'
import { IS_PRODUCTION } from '~/constants/env'

const SECRET_MIN_LENGTH = 32
const TOKEN_MIN_LENGTH = 16

export const serverEnv = createEnv({
  server: {
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_TWITTER_ID: z.string(),
    AUTH_TWITTER_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string().min(SECRET_MIN_LENGTH),
    VISITOR_KEY_SALT: z.string().min(SECRET_MIN_LENGTH),
    BUNNY_ACCESS_KEY: z.string(),
    BUNNY_COLLECTION_ID: z.string(),
    BUNNY_TOKEN_AUTH_KEY: z.string().min(TOKEN_MIN_LENGTH),
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
    CRON_SECRET: z.string().min(TOKEN_MIN_LENGTH).optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .optional()
  },
  // oxlint-disable-next-line node/no-process-env -- the validated server env is the boundary that reads the process environment
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})

export const matchIsProductionDeployment = () => {
  const { VERCEL_ENV } = serverEnv

  return VERCEL_ENV === undefined ? IS_PRODUCTION : VERCEL_ENV === 'production'
}

export const matchIsDeployed = () => {
  const { VERCEL_ENV } = serverEnv

  return VERCEL_ENV === undefined ? IS_PRODUCTION : VERCEL_ENV !== 'development'
}
