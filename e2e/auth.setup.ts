import { expect, test as setup } from '@playwright/test'
import { E2E_PASSWORD, E2E_ROLES, matchIsE2eRoleName } from './constants'
import { resolveStorageStatePath } from './env'

setup.describe.configure({ mode: 'parallel' })

setup.describe('the e2e roles', () => {
  for (const [roleName, role] of Object.entries(E2E_ROLES)) {
    if (!matchIsE2eRoleName(roleName) || !role.emailVerified) {
      continue
    }

    setup(`sign in as ${roleName}`, async ({ playwright, baseURL }) => {
      const context = await playwright.request.newContext({ baseURL })

      const response = await context.post('/api/auth/sign-in/email', {
        data: { email: role.email, password: E2E_PASSWORD }
      })

      expect(response.ok()).toBe(true)

      await context.storageState({
        path: resolveStorageStatePath(roleName)
      })
      await context.dispose()
    })
  }
})
