// See .env.example for documentation on each variable
import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url(),
    VITE_BUNNY_LIBRARY_ID: z.string(),
    VITE_BUNNY_HOSTNAME: z.string()
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
})
