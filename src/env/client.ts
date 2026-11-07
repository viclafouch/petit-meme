import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'
import { IS_TEST } from '../constants/env.ts'

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url(),
    VITE_BUNNY_LIBRARY_ID: z.string(),
    VITE_BUNNY_HOSTNAME: z.string(),
    VITE_ALGOLIA_APP_ID: z.string(),
    VITE_ALGOLIA_INSIGHTS_KEY: z.string(),
    VITE_ALGOLIA_INDEX: z.string(),
    VITE_SENTRY_DSN: z.url(),
    VITE_VERCEL_ENV: z
      .enum(['production', 'preview', 'development'])
      .default('development')
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
  skipValidation: IS_TEST
})
