import { signJWT } from 'better-auth/crypto'
import type { Page } from '@playwright/test'
import { ONE_HOUR_IN_SECONDS } from '~/constants/time'
import { E2E_AUTH_SECRET } from './env'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

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

export const buildEmailVerificationUrl = async (email: string) => {
  const token = await signJWT(
    { email: email.toLowerCase() },
    E2E_AUTH_SECRET,
    ONE_HOUR_IN_SECONDS
  )

  return `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/')}`
}
