/* oxlint-disable no-console */
import { hashPassword } from 'better-auth/crypto'
import { test as setup } from '@playwright/test'
import { prismaClient } from '~/db'
import { logEnvironmentInfo } from '../scripts/lib/env-guard'
import { clearDatabase } from './clear-database'
import { E2E_PASSWORD, E2E_ROLES, type E2eRole } from './constants'

const SEED_TIMEOUT_MS = 120_000

const createUser = async (role: E2eRole) => {
  const now = new Date()

  await prismaClient.user.create({
    data: {
      id: role.id,
      name: role.name,
      email: role.email,
      emailVerified: role.emailVerified,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      accounts: {
        create: {
          id: `${role.id}-account`,
          accountId: role.id,
          providerId: 'credential',
          password: await hashPassword(E2E_PASSWORD),
          createdAt: now,
          updatedAt: now
        }
      }
    }
  })
}

setup.afterAll(async () => {
  await prismaClient.$disconnect()
})

// Nothing is deleted at Stripe. A deleted customer leaves an id that outlives
// it, and better-auth then hands that id to Stripe, which refuses it. Test mode
// customers pile up instead, which costs nothing and breaks nothing.
setup('seed the e2e environment', async () => {
  setup.setTimeout(SEED_TIMEOUT_MS)
  logEnvironmentInfo()

  await clearDatabase()

  await Promise.all(
    Object.values(E2E_ROLES).map((role) => {
      return createUser(role)
    })
  )
  console.log(`  ${Object.keys(E2E_ROLES).length} users created`)
})
