import { expect, type FrameLocator, type Page } from '@playwright/test'
import { prismaClient } from '~/db/client.server'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import { STRIPE_TEST_CARD } from './constants'
import { repeatUntilRequested } from './hydration'
import { E2E_LOCALE } from './locales'

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
        .getByRole('button', {
          name: m.nav_upgrade_premium({}, { locale })
        })
        .click()
    },
    { page, urlPattern: /subscription\/upgrade/u }
  )

  await page.waitForURL(/checkout\.stripe\.com/u)
}

const STRIPE_PAYMENT_FORM_FRAME = 'iframe[src*="elements-inner-habanero"]'

const getStripePaymentForm = (page: Page) => {
  return page.locator(STRIPE_PAYMENT_FORM_FRAME).contentFrame()
}

type StripeFieldId =
  | 'payment-numberInput'
  | 'payment-expiryInput'
  | 'payment-cvcInput'
  | 'payment-nameInput'
  | 'payment-countryInput'
  | 'payment-linkOptInInput'

const getStripeField = (form: FrameLocator, fieldId: StripeFieldId) => {
  return form.locator(`#${fieldId}`)
}

export const payWithTestCard = async (page: Page, cardholderName: string) => {
  const form = getStripePaymentForm(page)

  await form
    .getByRole('button')
    .filter({ has: form.getByTestId('visa') })
    .click()
  await getStripeField(form, 'payment-numberInput').fill(
    STRIPE_TEST_CARD.number
  )
  await getStripeField(form, 'payment-expiryInput').fill(
    STRIPE_TEST_CARD.expiry
  )
  await getStripeField(form, 'payment-cvcInput').fill(STRIPE_TEST_CARD.cvc)
  await getStripeField(form, 'payment-nameInput').fill(cardholderName)
  await getStripeField(form, 'payment-countryInput').selectOption(
    STRIPE_TEST_CARD.billingCountry
  )
  await getStripeField(form, 'payment-linkOptInInput').setChecked(false)
  await form.getByTestId('payment-form-submit-button').click()

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
