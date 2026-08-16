import type { Locator, Page } from '@playwright/test'
import { prismaClient } from '~/db'
import { UserLocale } from '~/db/generated/prisma/enums'
import { buildEmailVerificationUrl, openAuthDialog } from './auth-flows'
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, E2E_ROLES } from './constants'
import { expect, test } from './fixtures'
import { m } from './messages'

const SIGNUP_USER = {
  name: 'E2E Signup',
  email: `e2e-signup@${E2E_EMAIL_DOMAIN}`
}

const IMPOSTOR_NAME = 'E2E Impostor'

const findSignupUser = () => {
  return prismaClient.user.findUnique({ where: { email: SIGNUP_USER.email } })
}

const openSignupPanel = async (page: Page) => {
  const dialog = await openAuthDialog(page)

  await dialog.getByRole('tab', { name: m.auth_create_account() }).click()

  return dialog.getByRole('tabpanel')
}

const fillSignupForm = async (panel: Locator, name: string, email: string) => {
  await panel.getByRole('textbox', { name: m.auth_username() }).fill(name)
  await panel.getByRole('textbox', { name: m.common_email() }).fill(email)
  await panel
    .getByLabel(m.common_password(), { exact: true })
    .fill(E2E_PASSWORD)
  await panel.getByLabel(m.auth_confirm_password()).fill(E2E_PASSWORD)
  await panel.getByRole('checkbox').check()
  await panel.getByRole('button', { name: m.auth_create_account() }).click()
}

test('a Visitor signs up, verifies their email and comes back signed in', async ({
  page
}) => {
  await page.goto('/')

  const signupPanel = await openSignupPanel(page)

  await fillSignupForm(signupPanel, SIGNUP_USER.name, SIGNUP_USER.email)

  await expect(
    signupPanel.getByText(m.auth_signup_success_title())
  ).toBeVisible()

  // The fields our own hooks add on top of better-auth. A Prisma model one
  // version behind drops them without saying anything.
  const createdUser = await findSignupUser()

  expect(createdUser).toMatchObject({
    name: SIGNUP_USER.name,
    emailVerified: false,
    providerAvatar: null,
    locale: UserLocale.fr,
    termsAcceptedAt: expect.any(Date),
    privacyAcceptedAt: expect.any(Date)
  })
  expect(createdUser?.image).toBeTruthy()

  await page.goto(await buildEmailVerificationUrl(SIGNUP_USER.email))

  await expect(
    page.getByRole('banner').getByText(SIGNUP_USER.name)
  ).toBeVisible()
  expect(await findSignupUser()).toMatchObject({ emailVerified: true })
})

// Because `requireEmailVerification` is on, better-auth answers a sign up on a
// taken address exactly as it answers a new one, and writes nothing. Turning
// that option off would turn the signup form into a way to ask whether someone
// has an account here, which is the thing this test is here to notice.
test('an address that already has an account gives nothing away', async ({
  page
}) => {
  await page.goto('/')

  const signupPanel = await openSignupPanel(page)

  await fillSignupForm(signupPanel, IMPOSTOR_NAME, E2E_ROLES.free.email)

  await expect(
    signupPanel.getByText(m.auth_signup_success_title())
  ).toBeVisible()
  await expect(
    signupPanel.getByText(m.auth_error_user_already_exists_use_another())
  ).toBeHidden()

  expect(
    await prismaClient.user.findUnique({
      where: { email: E2E_ROLES.free.email },
      select: { id: true, name: true }
    })
  ).toEqual({ id: E2E_ROLES.free.id, name: E2E_ROLES.free.name })
})
