import { expect, test as setup } from '@playwright/test'
import { E2E_PASSWORD, E2E_ROLES, type E2eRoleName } from './constants'
import { resolveStorageStatePath } from './env'

// Signing in over the HTTP API rather than through the dialog: the login screen
// is covered by its own test, every other test only needs the cookie. It also
// proves the seeded rows are the ones better-auth expects.
for (const [roleName, role] of Object.entries(E2E_ROLES)) {
  setup(`sign in as ${roleName}`, async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL })

    const response = await context.post('/api/auth/sign-in/email', {
      data: { email: role.email, password: E2E_PASSWORD }
    })

    expect(response.ok()).toBe(true)

    await context.storageState({
      path: resolveStorageStatePath(roleName as E2eRoleName)
    })
    await context.dispose()
  })
}
