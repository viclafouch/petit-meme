import { randomUUID } from 'node:crypto'
import type { Stripe } from 'stripe'
import { expect, type Page, request } from '@playwright/test'
import { STRIPE_API_VERSION } from '~/constants/stripe'
import { prismaClient } from '~/db/client.server'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import {
  getStripeClient,
  toUnixSeconds
} from '~/server/platforms/stripe.server'
import { STRIPE_TEST_PAYMENT_METHOD } from './constants'
import { E2E_BASE_URL, E2E_STRIPE_WEBHOOK_SECRET } from './env'
import { repeatUntilRequested } from './hydration'
import { E2E_LOCALE } from './locales'

const SUBSCRIPTION_WRITE_TIMEOUT_MS = 15_000
const CHECKOUT_SESSION_ID = /\/(?<checkoutSessionId>cs_test_\w+)/u
const CHECKOUT_SESSION_ID_TEMPLATE = '{CHECKOUT_SESSION_ID}'
const STRIPE_WEBHOOK_PATHNAME = '/api/auth/stripe/webhook'

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

  const checkoutSessionId = CHECKOUT_SESSION_ID.exec(
    new URL(page.url()).pathname
  )?.groups?.checkoutSessionId

  if (!checkoutSessionId) {
    throw new Error(`No Checkout Session in ${page.url()}`)
  }

  return getStripeClient().checkout.sessions.retrieve(checkoutSessionId, {
    expand: ['line_items']
  })
}

type ExpectedCheckoutSession = {
  referenceId: string
  priceId: string
}

export const expectCheckoutSession = async (
  checkoutSession: Stripe.Checkout.Session,
  { referenceId, priceId }: ExpectedCheckoutSession
) => {
  const { stripeCustomerId } = await prismaClient.user.findUniqueOrThrow({
    where: { id: referenceId },
    select: { stripeCustomerId: true }
  })

  expect(checkoutSession).toMatchObject({
    mode: 'subscription',
    status: 'open',
    client_reference_id: referenceId,
    customer: stripeCustomerId,
    line_items: { data: [{ price: { id: priceId }, quantity: 1 }] }
  })
}

const sendCheckoutCompletedEvent = async (
  completedCheckoutSession: Stripe.Checkout.Session
) => {
  const payload = JSON.stringify({
    id: `evt_e2e_${randomUUID()}`,
    object: 'event',
    type: 'checkout.session.completed',
    api_version: STRIPE_API_VERSION,
    created: toUnixSeconds(new Date()),
    livemode: false,
    data: { object: completedCheckoutSession }
  })

  const stripeRequest = await request.newContext({
    baseURL: E2E_BASE_URL,
    storageState: { cookies: [], origins: [] }
  })
  const response = await stripeRequest.post(STRIPE_WEBHOOK_PATHNAME, {
    headers: {
      'content-type': 'application/json',
      'stripe-signature': getStripeClient().webhooks.generateTestHeaderString({
        payload,
        secret: E2E_STRIPE_WEBHOOK_SECRET
      })
    },
    data: payload
  })

  expect(response.ok(), await response.text()).toBe(true)
  await stripeRequest.dispose()
}

export const completeCheckout = async (
  page: Page,
  checkoutSession: Stripe.Checkout.Session
) => {
  const stripeClient = getStripeClient()
  const { customer: customerId, success_url: successUrl } = checkoutSession
  const priceId = checkoutSession.line_items?.data[0]?.price?.id

  if (typeof customerId !== 'string' || !priceId || !successUrl) {
    throw new Error(`Checkout Session ${checkoutSession.id} is incomplete`)
  }

  const paymentMethod = await stripeClient.paymentMethods.attach(
    STRIPE_TEST_PAYMENT_METHOD,
    { customer: customerId }
  )
  const stripeSubscription = await stripeClient.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethod.id,
    metadata: checkoutSession.metadata ?? {}
  })

  await sendCheckoutCompletedEvent({
    ...checkoutSession,
    status: 'complete',
    payment_status: 'paid',
    subscription: stripeSubscription.id
  })

  await page.goto(
    successUrl.replace(CHECKOUT_SESSION_ID_TEMPLATE, checkoutSession.id)
  )
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
