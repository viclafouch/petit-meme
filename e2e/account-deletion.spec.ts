import type { Page } from '@playwright/test'
import { prismaClient } from '~/db'
import { openAuthDialog } from './auth-flows'
import { E2E_PASSWORD, E2E_ROLES, E2E_WRONG_PASSWORD } from './constants'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

const openDeleteAccountDialog = async (page: Page) => {
  await page.goto('/settings')

  const dialog = page.getByRole('dialog')

  await repeatUntilVisible(async () => {
    await page
      .getByRole('button', { name: m.settings_delete_account() })
      .click()
  }, dialog)

  return dialog
}

const askForDeletion = async (page: Page, password: string) => {
  const dialog = await openDeleteAccountDialog(page)

  await dialog.getByLabel(m.auth_current_password()).fill(password)
  await dialog.getByRole('button', { name: m.auth_delete() }).click()
  await dialog.getByRole('button', { name: m.auth_confirm_deletion() }).click()

  return dialog
}

test.describe('a deletion that goes through', () => {
  test.use({ storageState: resolveStorageStatePath('deletion') })

  test('takes the account away and refuses the next sign in', async ({
    page
  }) => {
    await askForDeletion(page, E2E_PASSWORD)

    await expect(
      page.getByRole('banner').getByRole('button', { name: m.nav_sign_in() })
    ).toBeVisible()

    await expect
      .poll(() => {
        return prismaClient.user.count({
          where: { id: E2E_ROLES.deletion.id }
        })
      })
      .toBe(0)

    const authDialog = await openAuthDialog(page)
    const loginPanel = authDialog.getByRole('tabpanel')

    await loginPanel
      .getByRole('textbox', { name: m.common_email() })
      .fill(E2E_ROLES.deletion.email)
    await loginPanel.getByLabel(m.common_password()).fill(E2E_PASSWORD)
    await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

    await expect(
      loginPanel.getByText(m.auth_error_invalid_email_or_password())
    ).toBeVisible()
  })
})

test.describe('a deletion without the password', () => {
  test.use({ storageState: resolveStorageStatePath('deletionRefused') })

  test('is refused and leaves the account alone', async ({ page }) => {
    const dialog = await askForDeletion(page, E2E_WRONG_PASSWORD)

    await expect(
      dialog.getByText(m.auth_error_invalid_password())
    ).toBeVisible()

    expect(
      await prismaClient.user.count({
        where: { id: E2E_ROLES.deletionRefused.id }
      })
    ).toBe(1)
  })
})
