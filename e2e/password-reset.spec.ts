import { prismaClient } from '~/db'
import { openAuthDialog } from './auth-flows'
import { E2E_ROLES } from './constants'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilRequested, repeatUntilVisible } from './hydration'
import { m } from './messages'

const NEW_PASSWORD = 'e2e-reset-password-2026'
const RESET_IDENTIFIER_PREFIX = 'reset-password:'

// Signed in on purpose: the flow has to say something about the sessions that
// already existed when the password changed.
test.use({ storageState: resolveStorageStatePath('passwordReset') })

// The token better-auth mails is the tail of the verification identifier, and
// the row points back at the User through its value.
const readResetToken = async () => {
  const verification = await prismaClient.verification.findFirstOrThrow({
    where: {
      identifier: { startsWith: RESET_IDENTIFIER_PREFIX },
      value: E2E_ROLES.passwordReset.id
    },
    orderBy: { createdAt: 'desc' }
  })

  return verification.identifier.slice(RESET_IDENTIFIER_PREFIX.length)
}

test('a User resets their password, loses their sessions and signs in again', async ({
  page
}) => {
  await page.goto('/password/reset')

  await repeatUntilVisible(async () => {
    await page
      .getByRole('textbox', { name: m.common_email() })
      .fill(E2E_ROLES.passwordReset.email)
    await page.getByRole('button', { name: m.common_confirm() }).click()
  }, page.getByText(m.auth_reset_email_sent_title()))

  await page.goto(`/password/create-new?token=${await readResetToken()}`)

  await repeatUntilRequested(
    async () => {
      await page
        .getByLabel(m.common_password(), { exact: true })
        .fill(NEW_PASSWORD)
      await page.getByLabel(m.auth_confirm_password()).fill(NEW_PASSWORD)
      await page.getByRole('button', { name: m.common_confirm() }).click()
    },
    { page, urlPattern: /auth\/reset-password/u }
  )

  await page.waitForURL('/')

  await expect
    .poll(() => {
      return prismaClient.session.count({
        where: { userId: E2E_ROLES.passwordReset.id }
      })
    })
    .toBe(0)

  await page.context().clearCookies({ name: /^better-auth/u })
  await page.goto('/')

  const dialog = await openAuthDialog(page)
  const loginPanel = dialog.getByRole('tabpanel')

  await loginPanel
    .getByRole('textbox', { name: m.common_email() })
    .fill(E2E_ROLES.passwordReset.email)
  await loginPanel.getByLabel(m.common_password()).fill(NEW_PASSWORD)
  await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

  await expect(
    page.getByRole('banner').getByText(E2E_ROLES.passwordReset.name)
  ).toBeVisible()
})

test('a token that means nothing changes no password', async ({ page }) => {
  await page.goto('/password/create-new?token=not-a-token')

  await repeatUntilVisible(async () => {
    await page
      .getByLabel(m.common_password(), { exact: true })
      .fill(NEW_PASSWORD)
    await page.getByLabel(m.auth_confirm_password()).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: m.common_confirm() }).click()
  }, page.getByText(m.auth_error_invalid_token()))

  await expect(page).toHaveURL(/password\/create-new/u)
})
