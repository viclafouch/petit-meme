import { z } from 'zod'

export const clientEnvSchema = {
  VITE_SITE_URL: z.url(),
  VITE_BUNNY_HOSTNAME: z.string(),
  VITE_ALGOLIA_APP_ID: z.string(),
  VITE_ALGOLIA_INSIGHTS_KEY: z.string(),
  VITE_ALGOLIA_INDEX: z.string(),
  VITE_SENTRY_DSN: z.url()
}
