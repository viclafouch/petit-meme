import dotenv from 'dotenv'
import { z } from 'zod'
import type { E2eRoleName } from './constants'

const E2E_ENV_SCHEMA = z.object({
  VITE_SITE_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  VITE_BUNNY_HOSTNAME: z.string().min(1),
  E2E_VIDEO_BUNNY_ID: z.string().min(1),
  CRON_SECRET: z.string().min(1)
})

const parsedE2eEnv = E2E_ENV_SCHEMA.safeParse(
  dotenv.config({
    path: '.env.e2e',
    override: true,
    quiet: true
  }).parsed
)

if (!parsedE2eEnv.success) {
  throw new Error(
    'Missing .env.e2e, or missing one of VITE_SITE_URL, DATABASE_URL, BETTER_AUTH_SECRET, VITE_BUNNY_HOSTNAME, E2E_VIDEO_BUNNY_ID or CRON_SECRET in it.'
  )
}

export const E2E_BASE_URL = parsedE2eEnv.data.VITE_SITE_URL
export const E2E_DATABASE_URL = parsedE2eEnv.data.DATABASE_URL
export const E2E_AUTH_SECRET = parsedE2eEnv.data.BETTER_AUTH_SECRET
export const E2E_BUNNY_HOSTNAME = parsedE2eEnv.data.VITE_BUNNY_HOSTNAME
export const { E2E_VIDEO_BUNNY_ID } = parsedE2eEnv.data
export const E2E_CRON_SECRET = parsedE2eEnv.data.CRON_SECRET

// oxlint-disable-next-line node/no-process-env -- the e2e env boundary reads the CI flag that GitHub Actions sets
export const IS_CI = Boolean(process.env.CI)

export const matchIsE2eDatabaseInUse = () => {
  // oxlint-disable-next-line node/no-process-env -- the e2e env boundary checks the DATABASE_URL that Prisma reads
  return process.env.DATABASE_URL === E2E_DATABASE_URL
}

export const resolveStorageStatePath = (roleName: E2eRoleName) => {
  return `e2e/.auth/${roleName}.json`
}
