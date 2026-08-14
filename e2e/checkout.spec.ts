import { prismaClient } from '~/db'
import { E2E_ROLES, STRIPE_TEST_CARD } from './constants'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'

const CLICK_ACKNOWLEDGED_MS = 3000
const HYDRATION_GIVE_UP_MS = 20_000
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
  await page.goto('/pricing')

  const premiumCard = page.getByTestId('pricing-card-premium')

  // The button is server rendered before React attaches its handler, so a click
  // that lands too early is simply lost, and Playwright has no way to know it.
  // Retry until the request actually leaves, and never after: a second checkout
  // call on the same User is refused, which is what a Visitor who double clicks
  // gets too.
  await expect(async () => {
    await Promise.all([
      page.waitForRequest(/subscription\/upgrade/u, {
        timeout: CLICK_ACKNOWLEDGED_MS
      }),
      premiumCard.getByRole('button').click()
    ])
  }).toPass({ timeout: HYDRATION_GIVE_UP_MS })

  await page.waitForURL(/checkout\.stripe\.com/u)

  // Locators owned by Stripe's hosted checkout, not by us. Its test ids are
  // stable and say nothing about the language, unlike the labels.
  const submitButton = page.getByTestId('hosted-payment-submit-button')
  await submitButton.waitFor()

  // Stripe folds the card form behind a payment method picker as soon as the
  // browser offers a wallet, which a Mac does and the Linux runner does not.
  const cardNumber = page.locator('#cardNumber')

  if (!(await cardNumber.isVisible())) {
    await page.getByTestId('card-accordion-item').click()
  }

  await cardNumber.fill(STRIPE_TEST_CARD.number)
  await page.locator('#cardExpiry').fill(STRIPE_TEST_CARD.expiry)
  await page.locator('#cardCvc').fill(STRIPE_TEST_CARD.cvc)
  await page.locator('#billingName').fill(E2E_ROLES.checkout.name)
  await submitButton.click()

  await page.waitForURL('**/checkout/success')
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
