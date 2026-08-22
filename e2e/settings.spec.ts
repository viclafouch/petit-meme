import type { Locator, Page } from '@playwright/test'
import { openAuthDialog } from './auth-flows'
import { E2E_PASSWORD, E2E_ROLES, E2E_WRONG_PASSWORD } from './constants'
import { expectDownloadIsNotEmpty } from './downloads'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilRequested, repeatUntilVisible } from './hydration'
import { m } from './messages'
import { SERVER_FUNCTION_URL_PATTERN } from './server-functions'

const NEW_PASSWORD = 'e2e-settings-password-2026'
const AVATAR_SLOT_NUMBER = '3'
const SESSION_URL_PATTERN = /auth\/get-session/u
const STRIPE_BILLING_PORTAL_ORIGIN = 'https://billing.stripe.com'
const BILLING_PORTAL_URL_PATTERN = /subscription\/billing-portal/u
// A billing portal session lives under this path, and a Stripe page that is not
// one would answer the origin alone.
const STRIPE_PORTAL_SESSION_PATH = '/p/session'

// The upgrade button and the manage subscription button are also carried by the
// header dropdown and by the phone navigation, so the page's own copy is looked
// for inside the main landmark.
const getSettingsButton = (page: Page, name: string) => {
  return page.getByRole('main').getByRole('button', { name })
}

const openAvatarPicker = async (page: Page) => {
  const dialog = page.getByRole('dialog', { name: m.settings_avatar_change() })

  await repeatUntilVisible(async () => {
    await page.getByRole('button', { name: m.settings_avatar_change() }).click()
  }, dialog)

  return dialog
}

// Slot twenty three answers to a name that contains slot two's, so the value
// under test carries the whole assertion only when it is compared exactly.
const getAvatarSlot = (dialog: Locator, number: string) => {
  return dialog.getByRole('radio', {
    name: m.settings_avatar_slot_label({ number }),
    exact: true
  })
}

// The screen turns on the optimistic update, so waiting for it would leave the
// write in flight. The session that follows is the real signal: better-auth
// caches a session in a signed cookie for five minutes, and a reload before
// that refresh reads the Avatar the User had before the click.
const pickAvatar = async (page: Page, tile: Locator) => {
  const sessionRefreshed = page.waitForResponse(SESSION_URL_PATTERN)

  await tile.click()
  await sessionRefreshed

  await expect(tile).toBeChecked()
}

const openUpdatePasswordDialog = async (page: Page) => {
  const dialog = page.getByRole('dialog', {
    name: m.settings_change_password()
  })

  await repeatUntilVisible(async () => {
    await page
      .getByRole('button', { name: m.settings_change_password() })
      .click()
  }, dialog)

  return dialog
}

type SubmitPasswordUpdateParams = {
  dialog: Locator
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const submitPasswordUpdate = async ({
  dialog,
  currentPassword,
  newPassword,
  confirmPassword
}: SubmitPasswordUpdateParams) => {
  await dialog.getByLabel(m.auth_current_password()).fill(currentPassword)
  await dialog.getByLabel(m.auth_new_password()).fill(newPassword)
  await dialog.getByLabel(m.auth_confirm_password()).fill(confirmPassword)

  // The trigger of this dialog is named « Modifier mon mot de passe », which
  // contains the name of the submit button.
  await dialog
    .getByRole('button', { name: m.auth_update(), exact: true })
    .click()
}

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('sees their account, their free plan and the way to Premium', async ({
    page
  }) => {
    const response = await page.goto('/settings')

    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: E2E_ROLES.free.name })
    ).toBeVisible()
    await expect(page.getByText(E2E_ROLES.free.email)).toBeVisible()
    await expect(page.getByText(m.settings_badge_tester())).toBeVisible()
    await expect(
      page.getByText(m.settings_current_subscription())
    ).toBeVisible()

    await page
      .getByRole('main')
      .getByRole('link', { name: m.nav_upgrade_premium() })
      .click()

    await expect(page).toHaveURL('/pricing')
  })

  test('leaves with a copy of their personal data', async ({ page }) => {
    await page.goto('/settings')

    const downloadStarted = page.waitForEvent('download')

    await repeatUntilRequested(
      async () => {
        await getSettingsButton(page, m.settings_download_data()).click()
      },
      { page, urlPattern: SERVER_FUNCTION_URL_PATTERN }
    )

    const download = await downloadStarted

    expect(download.suggestedFilename()).toBe(
      `${m.settings_data_export_filename()}.json`
    )
    await expectDownloadIsNotEmpty(download)
  })

  test('is refused a password change when the confirmation does not match', async ({
    page
  }) => {
    await page.goto('/settings')

    const dialog = await openUpdatePasswordDialog(page)

    await submitPasswordUpdate({
      dialog,
      currentPassword: E2E_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: E2E_WRONG_PASSWORD
    })

    await expect(
      dialog.getByText(m.validation_passwords_dont_match())
    ).toBeVisible()
    await expect(dialog.getByText(m.auth_password_updated_title())).toBeHidden()
  })

  test('is refused a password change when the current password is wrong', async ({
    page
  }) => {
    await page.goto('/settings')

    const dialog = await openUpdatePasswordDialog(page)

    await submitPasswordUpdate({
      dialog,
      currentPassword: E2E_WRONG_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    })

    await expect(
      dialog.getByText(m.auth_error_invalid_password())
    ).toBeVisible()
    await expect(dialog.getByText(m.auth_password_updated_title())).toBeHidden()
  })
})

test.describe('a User who picks an AvatarSlot', () => {
  test.use({ storageState: resolveStorageStatePath('avatar') })

  test('keeps the slot they picked after a reload', async ({ page }) => {
    await page.goto('/settings')

    const dialog = await openAvatarPicker(page)

    await pickAvatar(page, getAvatarSlot(dialog, AVATAR_SLOT_NUMBER))

    await page.reload()

    const reloadedDialog = await openAvatarPicker(page)

    await expect(
      getAvatarSlot(reloadedDialog, AVATAR_SLOT_NUMBER)
    ).toBeChecked()
  })
})

test.describe('a User who arrived with a ProviderAvatar', () => {
  test.use({ storageState: resolveStorageStatePath('avatarProvider') })

  test('picks an AvatarSlot and finds the way back to their ProviderAvatar', async ({
    page
  }) => {
    await page.goto('/settings')

    const dialog = await openAvatarPicker(page)
    const slot = getAvatarSlot(dialog, AVATAR_SLOT_NUMBER)
    const providerTile = dialog.getByRole('radio', {
      name: m.settings_avatar_provider_label()
    })

    await pickAvatar(page, slot)
    await pickAvatar(page, providerTile)

    await expect(slot).not.toBeChecked()
  })
})

test.describe('a User who changes their password', () => {
  test.use({ storageState: resolveStorageStatePath('passwordUpdate') })

  test('signs in again with the new one', async ({ page }) => {
    await page.goto('/settings')

    const dialog = await openUpdatePasswordDialog(page)

    await submitPasswordUpdate({
      dialog,
      currentPassword: E2E_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    })

    await expect(
      dialog.getByText(m.auth_password_updated_title())
    ).toBeVisible()

    await page.context().clearCookies({ name: /^better-auth/u })
    await page.goto('/')

    const authDialog = await openAuthDialog(page)
    const loginPanel = authDialog.getByRole('tabpanel')

    await loginPanel
      .getByRole('textbox', { name: m.common_email() })
      .fill(E2E_ROLES.passwordUpdate.email)
    await loginPanel.getByLabel(m.common_password()).fill(NEW_PASSWORD)
    await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

    await expect(
      page.getByRole('banner').getByText(E2E_ROLES.passwordUpdate.name)
    ).toBeVisible()
  })
})

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('billingPortal') })

  test('sees their Premium plan and is handed over to the Stripe portal', async ({
    page
  }) => {
    // The portal belongs to Stripe and is never crossed: the run stops at the
    // door and only checks that the door is the right one.
    await page.route(`${STRIPE_BILLING_PORTAL_ORIGIN}/**`, (route) => {
      return route.abort()
    })

    await page.goto('/settings')

    await expect(page.getByText(m.settings_badge_premium())).toBeVisible()
    await expect(
      page.getByText(m.settings_current_subscription())
    ).toBeVisible()

    const portalRequested = page.waitForRequest((request) => {
      return request.url().startsWith(STRIPE_BILLING_PORTAL_ORIGIN)
    })

    await repeatUntilRequested(
      async () => {
        await getSettingsButton(page, m.nav_manage_subscription()).click()
      },
      { page, urlPattern: BILLING_PORTAL_URL_PATTERN }
    )

    const portalRequest = await portalRequested

    expect(portalRequest.url()).toContain(STRIPE_PORTAL_SESSION_PATH)
  })
})

test.describe('a Premium whose subscription still runs', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('is asked to cancel before deleting their account', async ({ page }) => {
    await page.goto('/settings')

    await repeatUntilVisible(async () => {
      await getSettingsButton(page, m.settings_delete_account()).click()
    }, page.getByText(m.settings_cancel_subscription_first()))

    await expect(page.getByRole('dialog')).toBeHidden()
  })
})

test('an anonymous Visitor is sent back to the home page', async ({ page }) => {
  await page.goto('/settings')

  await expect(page).toHaveURL('/')
})
