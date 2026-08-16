import { signJWT } from 'better-auth/crypto'
import type { Page } from '@playwright/test'
import { ONE_HOUR_IN_SECONDS } from '~/constants/time'
import { E2E_AUTH_SECRET } from './env'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

export const openAuthDialog = async (page: Page) => {
  const dialog = page.getByRole('dialog')

  // Scoped to the header: once the dialog is open, its own submit button
  // carries the same name.
  await repeatUntilVisible(async () => {
    await page
      .getByRole('banner')
      .getByRole('button', { name: m.nav_sign_in() })
      .click()
  }, dialog)

  return dialog
}

// better-auth signs the email verification token as a JWT and stores nothing,
// unlike the password reset token which does leave a `verification` row. There
// is no token to read back, so the suite mints the one the email would have
// carried. Everything that URL then triggers is the real route.
export const buildEmailVerificationUrl = async (email: string) => {
  const token = await signJWT(
    { email: email.toLowerCase() },
    E2E_AUTH_SECRET,
    ONE_HOUR_IN_SECONDS
  )

  return `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/')}`
}
