import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'
import { IS_TEST } from '../constants/env.ts'
import { clientEnvSchema } from './client-schema.ts'

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    ...clientEnvSchema,
    VITE_VERCEL_ENV: z
      .enum(['production', 'preview', 'development'])
      .default('development')
  },
  runtimeEnvStrict: {
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
    VITE_BUNNY_HOSTNAME: import.meta.env.VITE_BUNNY_HOSTNAME,
    VITE_ALGOLIA_APP_ID: import.meta.env.VITE_ALGOLIA_APP_ID,
    VITE_ALGOLIA_INSIGHTS_KEY: import.meta.env.VITE_ALGOLIA_INSIGHTS_KEY,
    VITE_ALGOLIA_INDEX: import.meta.env.VITE_ALGOLIA_INDEX,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV
  },
  emptyStringAsUndefined: true,
  skipValidation: IS_TEST
})
