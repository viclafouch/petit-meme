import { openAuthDialog } from './auth-flows'
import { E2E_PASSWORD, E2E_ROLES, E2E_WRONG_PASSWORD } from './constants'
import { E2E_BASE_URL } from './env'
import { expect, test } from './fixtures'
import { m } from './messages'

type SocialProvider = {
  id: string
  label: string
  authorizeOrigin: string
}

const SOCIAL_PROVIDERS = [
  {
    id: 'twitter',
    label: m.auth_continue_with_x(),
    authorizeOrigin: 'https://x.com'
  },
  {
    id: 'discord',
    label: m.auth_continue_with_discord(),
    authorizeOrigin: 'https://discord.com'
  }
] as const satisfies readonly SocialProvider[]

test('a verified User signs in and the dialog gets out of the way', async ({
  page
}) => {
  await page.goto('/')

  const dialog = await openAuthDialog(page)
  const loginPanel = dialog.getByRole('tabpanel')

  await loginPanel
    .getByRole('textbox', { name: m.common_email() })
    .fill(E2E_ROLES.free.email)
  await loginPanel.getByLabel(m.common_password()).fill(E2E_PASSWORD)
  await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

  await expect(
    page.getByRole('banner').getByText(E2E_ROLES.free.name)
  ).toBeVisible()
  await expect(dialog).toBeHidden()
})

test('a wrong password keeps the Visitor on the dialog with a reason', async ({
  page
}) => {
  await page.goto('/')

  const dialog = await openAuthDialog(page)
  const loginPanel = dialog.getByRole('tabpanel')

  await loginPanel
    .getByRole('textbox', { name: m.common_email() })
    .fill(E2E_ROLES.free.email)
  await loginPanel.getByLabel(m.common_password()).fill(E2E_WRONG_PASSWORD)
  await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

  await expect(
    loginPanel.getByText(m.auth_error_invalid_email_or_password())
  ).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('an unverified account is told to verify its email', async ({ page }) => {
  await page.goto('/')

  const dialog = await openAuthDialog(page)
  const loginPanel = dialog.getByRole('tabpanel')

  await loginPanel
    .getByRole('textbox', { name: m.common_email() })
    .fill(E2E_ROLES.unverified.email)
  await loginPanel.getByLabel(m.common_password()).fill(E2E_PASSWORD)
  await loginPanel.getByRole('button', { name: m.nav_sign_in() }).click()

  await expect(
    loginPanel.getByText(m.auth_email_not_verified_title())
  ).toBeVisible()
  await expect(dialog).toBeVisible()
})

for (const provider of SOCIAL_PROVIDERS) {
  test(`the ${provider.id} button hands the Visitor over to ${provider.id}`, async ({
    page
  }) => {
    // The provider screen belongs to a third party and is never crossed: the
    // run stops at the door and only checks it is the right one.
    await page.route(`${provider.authorizeOrigin}/**`, (route) => {
      return route.abort()
    })

    await page.goto('/')

    const dialog = await openAuthDialog(page)
    const providerButton = dialog.getByRole('button', { name: provider.label })

    await expect(providerButton).toBeVisible()

    const [authorizeRequest] = await Promise.all([
      page.waitForRequest((request) => {
        return request.url().startsWith(provider.authorizeOrigin)
      }),
      providerButton.click()
    ])

    // The browser really left for the provider, and it carries the way back to
    // our own callback rather than to whatever origin the run happens to use.
    const redirectUri = new URL(authorizeRequest.url()).searchParams.get(
      'redirect_uri'
    )

    expect(redirectUri).toBe(`${E2E_BASE_URL}/api/auth/callback/${provider.id}`)
  })
}
