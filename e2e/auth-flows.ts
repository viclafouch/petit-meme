import type { Page } from '@playwright/test'
import { ONE_HOUR_IN_SECONDS } from '~/constants/time'
import { m } from '~/paraglide/messages.js'
import { createEmailVerificationPath } from '~/utils/email-verification'
import { E2E_AUTH_SECRET } from './env'
import { repeatUntilVisible } from './hydration'
import { E2E_LOCALE } from './locales'

export const openAuthDialog = async (page: Page) => {
  const dialog = page.getByRole('dialog')

  await repeatUntilVisible(async () => {
    await page
      .getByRole('banner')
      .getByRole('button', { name: m.nav_sign_in() })
      .click()
  }, dialog)

  return dialog
}

export const getAuthDialogSignInButton = (page: Page) => {
  return page
    .getByRole('dialog')
    .getByRole('tabpanel')
    .getByRole('button', { name: m.nav_sign_in() })
}

export const buildEmailVerificationUrl = (email: string) => {
  return createEmailVerificationPath({
    email,
    secret: E2E_AUTH_SECRET,
    expiresInSeconds: ONE_HOUR_IN_SECONDS,
    locale: E2E_LOCALE
  })
}
