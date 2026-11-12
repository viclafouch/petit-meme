import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { convertSetCookieToCookie } from 'better-auth/test'
import { describe, expect, it } from 'vitest'
import { stripe, type Subscription } from '@better-auth/stripe'
import { USER_NAME_MAX_LENGTH } from '~/constants/auth'
import {
  ALREADY_SUBSCRIBED_ERROR_CODE,
  PREMIUM_PLAN_NAME
} from '~/constants/plan'
import { guardAuthEndpoints } from '~/server/auth/auth-hooks.server'
import { createFakeStripeClient } from '~/server/platforms/__tests__/stripe.fakes'

const VALID_SIGN_UP_BODY = {
  name: 'Alan',
  email: 'alan@example.test',
  password: 'correct-horse-battery'
}

const createTestAuth = () => {
  return betterAuth({
    secret: 'auth-guard-test-secret-0000000001',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    hooks: { before: guardAuthEndpoints }
  })
}

describe('signing up', () => {
  it('should create the User from the fields the sign up form sends', async () => {
    const auth = createTestAuth()

    const { user } = await auth.api.signUpEmail({ body: VALID_SIGN_UP_BODY })

    expect(user.email).toBe('alan@example.test')
  })

  it('should refuse a sign up that sets stripeCustomerId', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, stripeCustomerId: 'cus_victim' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a sign up that sets an image', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, image: 'https://attacker.test/t.png' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a name longer than the maximum length', async () => {
    const auth = createTestAuth()
    const body = {
      ...VALID_SIGN_UP_BODY,
      name: 'a'.repeat(USER_NAME_MAX_LENGTH + 1)
    }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a name made of spaces only', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, name: '   ' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should store the name without its surrounding spaces', async () => {
    const auth = createTestAuth()

    const { user } = await auth.api.signUpEmail({
      body: { ...VALID_SIGN_UP_BODY, name: '  Alan  ' }
    })

    expect(user.name).toBe('Alan')
  })
})

const CHECKOUT_URL = 'https://checkout.stripe.test/cs_test'

const STRIPE_RESPONSES = {
  'GET /v1/customers/search': {
    object: 'search_result',
    data: [],
    has_more: false
  },
  'POST /v1/customers': { id: 'cus_test', object: 'customer', metadata: {} },
  'GET /v1/subscriptions': { object: 'list', data: [], has_more: false },
  'GET /v1/prices/price_monthly': {
    id: 'price_monthly',
    object: 'price',
    recurring: { interval: 'month', usage_type: 'licensed' }
  },
  'POST /v1/checkout/sessions': {
    id: 'cs_test',
    object: 'checkout.session',
    url: CHECKOUT_URL
  }
} as const

const createSubscriptionTestAuth = () => {
  const subscription: Record<string, unknown>[] = []
  const database = {
    user: [],
    session: [],
    account: [],
    verification: [],
    subscription
  }
  const { stripeClient } = createFakeStripeClient({
    responses: STRIPE_RESPONSES
  })
  const auth = betterAuth({
    secret: 'auth-guard-test-secret-0000000001',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    hooks: { before: guardAuthEndpoints },
    plugins: [
      stripe({
        stripeClient,
        stripeWebhookSecret: 'whsec_test',
        subscription: {
          enabled: true,
          plans: [
            {
              name: PREMIUM_PLAN_NAME,
              priceId: 'price_monthly',
              annualDiscountPriceId: 'price_yearly'
            }
          ]
        }
      })
    ]
  })

  return { auth, database }
}

const signUpWithSubscriptions = async (statuses: Subscription['status'][]) => {
  const { auth, database } = createSubscriptionTestAuth()
  const { headers, response } = await auth.api.signUpEmail({
    body: VALID_SIGN_UP_BODY,
    returnHeaders: true
  })

  for (const status of statuses) {
    database.subscription.push({
      id: `sub-row-${status}`,
      plan: PREMIUM_PLAN_NAME,
      referenceId: response.user.id,
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: `sub_${status}`,
      status,
      seats: 1
    })
  }

  return { auth, headers: convertSetCookieToCookie(headers) }
}

const UPGRADE_BODY = {
  plan: PREMIUM_PLAN_NAME,
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  disableRedirect: true
}

describe('upgrading to Premium', () => {
  it.each(['active', 'trialing', 'past_due'] as const)(
    'should refuse a checkout to a User whose subscription is %s',
    async (status) => {
      const { auth, headers } = await signUpWithSubscriptions([status])

      await expect(
        auth.api.upgradeSubscription({ body: UPGRADE_BODY, headers })
      ).rejects.toMatchObject({
        statusCode: 400,
        body: { code: ALREADY_SUBSCRIBED_ERROR_CODE }
      })
    }
  )

  it('should send a User who never subscribed to the Stripe checkout', async () => {
    const { auth, headers } = await signUpWithSubscriptions([])

    const checkout = await auth.api.upgradeSubscription({
      body: UPGRADE_BODY,
      headers
    })

    expect(checkout.url).toBe(CHECKOUT_URL)
  })

  it('should send a User whose last subscription ended to the Stripe checkout', async () => {
    const { auth, headers } = await signUpWithSubscriptions(['canceled'])

    const checkout = await auth.api.upgradeSubscription({
      body: UPGRADE_BODY,
      headers
    })

    expect(checkout.url).toBe(CHECKOUT_URL)
  })
})
