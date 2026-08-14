import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'

// Entry point for the Playwright agents: it puts the browser in the state every
// scenario starts from, a signed in free User with the consent banner answered.
// The database itself is seeded by `seed.setup.ts`.
test.use({ storageState: resolveStorageStatePath('free') })

test('a signed in Visitor lands on the home page', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('main')).toBeVisible()
})
