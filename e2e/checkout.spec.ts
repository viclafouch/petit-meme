import type { Page } from '@playwright/test'
import { prismaClient } from '~/db'
import { E2E_ROLES, STRIPE_TEST_CARD } from './constants'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilRequested, repeatUntilVisible } from './hydration'
import { m } from './messages'

const SUBSCRIPTION_WRITE_TIMEOUT_MS = 15_000

const findSubscription = (referenceId: string) => {
  return prismaClient.subscription.findFirst({ where: { referenceId } })
}

// A second upgrade call on the same User is refused, which is also what a
// Visitor who double clicks gets, so the click is repeated only until the
// request leaves and never after.
const startCheckout = async (page: Page) => {
  await repeatUntilRequested(
    async () => {
      await page.getByRole('button', { name: m.nav_upgrade_premium() }).click()
    },
    { page, urlPattern: /subscription\/upgrade/u }
  )

  await page.waitForURL(/checkout\.stripe\.com/u)
}

// Locators owned by Stripe's hosted checkout, not by us. Its test ids are
// stable and say nothing about the language, unlike the labels.
const payWithTestCard = async (page: Page, cardholderName: string) => {
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
  await page.locator('#billingName').fill(cardholderName)
  await submitButton.click()

  await page.waitForURL('**/checkout/success')
}

const expectActiveSubscription = async (referenceId: string) => {
  await expect
    .poll(
      async () => {
        const subscription = await findSubscription(referenceId)

        return subscription?.status ?? null
      },
      { timeout: SUBSCRIPTION_WRITE_TIMEOUT_MS }
    )
    .toBe('active')
}

test.describe('a monthly checkout', () => {
  test.use({ storageState: resolveStorageStatePath('checkout') })

  test('turns the User into a Premium', async ({ page }) => {
    await page.goto('/pricing')
    await startCheckout(page)
    await payWithTestCard(page, E2E_ROLES.checkout.name)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkout.id)

    expect(await findSubscription(E2E_ROLES.checkout.id)).toMatchObject({
      plan: 'premium',
      status: 'active',
      billingInterval: 'month',
      stripeCustomerId: expect.stringMatching(/^cus_/u),
      stripeSubscriptionId: expect.stringMatching(/^sub_/u),
      periodStart: expect.any(Date),
      periodEnd: expect.any(Date)
    })

    await page.goto('/pricing')
    await expect(
      page.getByRole('button', { name: m.pricing_active_plan_sr() })
    ).toBeVisible()
  })
})

test.describe('an annual checkout', () => {
  test.use({ storageState: resolveStorageStatePath('checkoutAnnual') })

  test('turns the User into a Premium billed by the year', async ({ page }) => {
    await page.goto('/pricing')

    await repeatUntilVisible(
      async () => {
        await page.getByRole('radio', { name: m.pricing_yearly() }).click()
      },
      page.getByRole('radio', { name: m.pricing_yearly(), checked: true })
    )

    await startCheckout(page)
    await payWithTestCard(page, E2E_ROLES.checkoutAnnual.name)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkoutAnnual.id)

    expect(await findSubscription(E2E_ROLES.checkoutAnnual.id)).toMatchObject({
      plan: 'premium-annual',
      status: 'active',
      billingInterval: 'year',
      stripeCustomerId: expect.stringMatching(/^cus_/u),
      stripeSubscriptionId: expect.stringMatching(/^sub_/u),
      periodStart: expect.any(Date),
      periodEnd: expect.any(Date)
    })
  })
})
