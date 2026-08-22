import { expect, type Page } from '@playwright/test'
import { prismaClient } from '~/db'
import type { Locale } from '~/paraglide/runtime'
import { STRIPE_TEST_CARD } from './constants'
import { repeatUntilRequested } from './hydration'
import { E2E_LOCALE } from './locales'
import { m } from './messages'

const SUBSCRIPTION_WRITE_TIMEOUT_MS = 15_000

export const findSubscription = (referenceId: string) => {
  return prismaClient.subscription.findFirst({ where: { referenceId } })
}

export const startCheckout = async (
  page: Page,
  locale: Locale = E2E_LOCALE
) => {
  await repeatUntilRequested(
    async () => {
      await page
        .getByRole('button', { name: m.nav_upgrade_premium({}, { locale }) })
        .click()
    },
    { page, urlPattern: /subscription\/upgrade/u }
  )

  await page.waitForURL(/checkout\.stripe\.com/u)
}

const fillStripeHostedCardForm = async (page: Page, cardholderName: string) => {
  const cardNumber = page.locator('#cardNumber')
  const isCardFormFoldedBehindWalletPicker = !(await cardNumber.isVisible())

  if (isCardFormFoldedBehindWalletPicker) {
    await page.getByTestId('card-accordion-item').click()
  }

  await cardNumber.fill(STRIPE_TEST_CARD.number)
  await page.locator('#cardExpiry').fill(STRIPE_TEST_CARD.expiry)
  await page.locator('#cardCvc').fill(STRIPE_TEST_CARD.cvc)
  await page.locator('#billingName').fill(cardholderName)
}

export const payWithTestCard = async (page: Page, cardholderName: string) => {
  const submitButton = page.getByTestId('hosted-payment-submit-button')
  await submitButton.waitFor()

  await fillStripeHostedCardForm(page, cardholderName)
  await submitButton.click()

  await page.waitForURL('**/checkout/success')
}

export const expectActiveSubscription = async (referenceId: string) => {
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
