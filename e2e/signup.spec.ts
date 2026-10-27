import { expect, type Locator, type Page } from '@playwright/test'
import { prismaClient } from '~/db'
import { UserLocale } from '~/db/generated/prisma/enums'
import { m } from '~/paraglide/messages.js'
import { buildEmailVerificationUrl, openAuthDialog } from './auth-flows'
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, E2E_ROLES } from './constants'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'

const SIGNUP_USER = {
  name: 'E2E Signup',
  email: `e2e-signup@${E2E_EMAIL_DOMAIN}`
}

const IMPOSTOR_NAME = 'E2E Impostor'
const IMPOSTOR_PASSWORD = 'e2e-impostor-password'

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

test.describe('the sign up', () => {
  test('a Visitor signs up, verifies their email and comes back signed in', async ({
    page
  }) => {
    await page.goto('/')

    const signupPanel = await openSignupPanel(page)

    await fillSignupForm(signupPanel, SIGNUP_USER.name, SIGNUP_USER.email)

    await expect(
      signupPanel.getByText(m.auth_signup_success_title())
    ).toBeVisible()

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

    await repeatUntilVisible(async () => {
      const passwordField = page.getByLabel(m.common_password())
      await passwordField.clear()
      await passwordField.fill(E2E_PASSWORD)
      await page
        .getByRole('button', { name: m.auth_verify_email_submit() })
        .click()
    }, page.getByRole('banner').getByText(SIGNUP_USER.name))

    expect(await findSignupUser()).toMatchObject({ emailVerified: true })
  })

  test('the activation link refuses a password that is not the account one', async ({
    page
  }) => {
    await page.goto(await buildEmailVerificationUrl(E2E_ROLES.unverified.email))

    await repeatUntilVisible(async () => {
      const passwordField = page.getByLabel(m.common_password())
      await passwordField.clear()
      await passwordField.fill(IMPOSTOR_PASSWORD)
      await page
        .getByRole('button', { name: m.auth_verify_email_submit() })
        .click()
    }, page.getByText(m.auth_error_invalid_password()))

    expect(
      await prismaClient.user.findUnique({
        where: { email: E2E_ROLES.unverified.email },
        select: { emailVerified: true }
      })
    ).toStrictEqual({ emailVerified: false })
  })

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
    ).toStrictEqual({ id: E2E_ROLES.free.id, name: E2E_ROLES.free.name })
  })
})
