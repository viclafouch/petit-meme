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

if (!e2eEnv?.VITE_SITE_URL || !e2eEnv.DATABASE_URL) {
  throw new Error(
    'Missing .env.e2e, or missing VITE_SITE_URL or DATABASE_URL in it.'
  )
}

export const E2E_BASE_URL = e2eEnv.VITE_SITE_URL
export const E2E_DATABASE_URL = e2eEnv.DATABASE_URL

export const resolveStorageStatePath = (roleName: E2eRoleName) => {
  return `e2e/.auth/${roleName}.json`
}
