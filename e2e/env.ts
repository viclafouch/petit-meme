import dotenv from 'dotenv'
import type { E2eRoleName } from './constants'

// The suite has its own environment and never borrows another. `override`
// matters: without it an exported DATABASE_URL would win over this file, and
// the seed empties every table of whatever it is pointed at.
export const e2eEnv = dotenv.config({
  path: '.env.e2e',
  override: true,
  quiet: true
}).parsed

if (
  !e2eEnv?.VITE_SITE_URL ||
  !e2eEnv.DATABASE_URL ||
  !e2eEnv.BETTER_AUTH_SECRET ||
  !e2eEnv.VITE_BUNNY_HOSTNAME ||
  !e2eEnv.E2E_VIDEO_BUNNY_ID
) {
  throw new Error(
    'Missing .env.e2e, or missing one of VITE_SITE_URL, DATABASE_URL, BETTER_AUTH_SECRET, VITE_BUNNY_HOSTNAME or E2E_VIDEO_BUNNY_ID in it.'
  )
}

export const E2E_BASE_URL = e2eEnv.VITE_SITE_URL
export const E2E_DATABASE_URL = e2eEnv.DATABASE_URL
export const E2E_AUTH_SECRET = e2eEnv.BETTER_AUTH_SECRET
export const E2E_BUNNY_HOSTNAME = e2eEnv.VITE_BUNNY_HOSTNAME

// The one Video of the fixtures that exists at Bunny. It lives here rather
// than in `content.ts` because it names a resource of the `e2e` library, and
// recreating that library gives it another id.
export const { E2E_VIDEO_BUNNY_ID } = e2eEnv

export const resolveStorageStatePath = (roleName: E2eRoleName) => {
  return `e2e/.auth/${roleName}.json`
}
