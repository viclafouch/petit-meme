import { prismaClient } from '~/db'
import { E2E_ROLES, STRIPE_TEST_CARD } from './constants'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'

const CHECKOUT_TIMEOUT_MS = 180_000
const HYDRATION_RETRY_MS = 10_000
const SUBSCRIPTION_WRITE_TIMEOUT_MS = 15_000

test.use({ storageState: resolveStorageStatePath('checkout') })

test.afterAll(async () => {
  await prismaClient.$disconnect()
})

const findCheckoutSubscription = () => {
  return prismaClient.subscription.findFirst({
    where: { referenceId: E2E_ROLES.checkout.id }
  })
}

test('a paid checkout turns the User into a Premium', async ({ page }) => {
  test.setTimeout(CHECKOUT_TIMEOUT_MS)

  await page.goto('/pricing')

  const premiumCard = page.getByTestId('pricing-card-premium')

  // The button is server rendered before React attaches its handler, so a click
  // that lands too early is simply lost, and Playwright has no way to know it.
  // Retrying the pair until the navigation starts waits for hydration without
  // betting on a delay.
  await expect(async () => {
    await premiumCard.getByRole('button').click()
    await page.waitForURL(/checkout\.stripe\.com/u, {
      timeout: HYDRATION_RETRY_MS
    })
  }).toPass({ timeout: CHECKOUT_TIMEOUT_MS / 2 })

  // Locators owned by Stripe's hosted checkout, not by us.
  await page.locator('#cardNumber').fill(STRIPE_TEST_CARD.number)
  await page.locator('#cardExpiry').fill(STRIPE_TEST_CARD.expiry)
  await page.locator('#cardCvc').fill(STRIPE_TEST_CARD.cvc)
  await page.locator('#billingName').fill(E2E_ROLES.checkout.name)
  await page.getByTestId('hosted-payment-submit-button').click()

  await page.waitForURL('**/checkout/success', { timeout: CHECKOUT_TIMEOUT_MS })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expect
    .poll(
      async () => {
        const subscription = await findCheckoutSubscription()

        return subscription?.status ?? null
      },
      { timeout: SUBSCRIPTION_WRITE_TIMEOUT_MS }
    )
    .toBe('active')

  expect(await findCheckoutSubscription()).toMatchObject({
    plan: 'premium',
    status: 'active',
    billingInterval: 'month',
    stripeCustomerId: expect.stringMatching(/^cus_/u),
    stripeSubscriptionId: expect.stringMatching(/^sub_/u),
    periodStart: expect.any(Date),
    periodEnd: expect.any(Date)
  })

  await page.goto('/pricing')
  await expect(premiumCard.getByRole('button')).toHaveAttribute(
    'aria-disabled',
    'true'
  )
})
