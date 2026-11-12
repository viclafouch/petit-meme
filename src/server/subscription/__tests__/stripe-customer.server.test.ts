import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { describe, expect, it } from 'vitest'
import { stripe } from '@better-auth/stripe'
import { PREMIUM_PLAN_NAME } from '~/constants/plan'
import type { Locale } from '~/paraglide/runtime'
import {
  createFakeStripeClient,
  type FakeStripeRequest
} from '~/server/platforms/__tests__/stripe.fakes'
import {
  buildStripeCustomerCreateParams,
  giveUserLocaleToCheckoutStripeCustomer,
  giveUserLocaleToSignUpStripeCustomer
} from '~/server/subscription/stripe-customer.server'

const SIGN_UP_BODY = {
  name: 'Alan',
  email: 'alan@example.test',
  password: 'correct-horse-battery'
}

const STRIPE_WEBHOOK_SECRET = 'whsec_test'

const PERIOD_START_UNIX_SECONDS = 1_790_000_000

const PERIOD_END_UNIX_SECONDS = 1_792_592_000

const NO_CUSTOMER_FOUND = {
  object: 'search_result',
  data: [],
  has_more: false
}

const STRIPE_RESPONSES = {
  'GET /v1/customers/search': NO_CUSTOMER_FOUND,
  'POST /v1/customers': { id: 'cus_test', object: 'customer', metadata: {} },
  'GET /v1/customers/cus_test': {
    id: 'cus_test',
    object: 'customer',
    email: SIGN_UP_BODY.email,
    metadata: {}
  },
  'POST /v1/customers/cus_test': {
    id: 'cus_test',
    object: 'customer',
    metadata: {}
  },
  'GET /v1/subscriptions/sub_test': {
    id: 'sub_test',
    object: 'subscription',
    customer: 'cus_test',
    status: 'active',
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    ended_at: null,
    items: {
      object: 'list',
      data: [
        {
          id: 'si_test',
          object: 'subscription_item',
          quantity: 1,
          current_period_start: PERIOD_START_UNIX_SECONDS,
          current_period_end: PERIOD_END_UNIX_SECONDS,
          price: {
            id: 'price_monthly',
            object: 'price',
            recurring: { interval: 'month', usage_type: 'licensed' }
          }
        }
      ]
    }
  }
} as const

const CUSTOMER_FOUND_BY_EMAIL = {
  object: 'search_result',
  data: [
    {
      id: 'cus_test',
      object: 'customer',
      email: SIGN_UP_BODY.email,
      preferred_locales: [],
      metadata: {}
    }
  ],
  has_more: false
}

type CreateStripeCustomerTestAuthParams = {
  locale: Locale
  responses?: Record<string, object>
}

const createStripeCustomerTestAuth = ({
  locale,
  responses = STRIPE_RESPONSES
}: CreateStripeCustomerTestAuthParams) => {
  const subscription: Record<string, unknown>[] = []
  const database = {
    user: [],
    session: [],
    account: [],
    verification: [],
    subscription
  }
  const { stripeClient, stripeRequests } = createFakeStripeClient({
    responses
  })
  const auth = betterAuth({
    secret: 'stripe-customer-test-secret-00001',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, input: false }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            return { data: { ...user, emailVerified: true, locale } }
          }
        }
      }
    },
    plugins: [
      stripe({
        stripeClient,
        stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        getCustomerCreateParams: buildStripeCustomerCreateParams,
        onCustomerCreate: async ({ stripeCustomer, user }) => {
          await giveUserLocaleToSignUpStripeCustomer({
            stripeClient,
            stripeCustomer,
            user
          })
        },
        subscription: {
          enabled: true,
          onSubscriptionComplete: async (
            { subscription: completedSubscription, stripeSubscription },
            endpointContext
          ) => {
            await giveUserLocaleToCheckoutStripeCustomer({
              stripeClient,
              endpointContext,
              userId: completedSubscription.referenceId,
              stripeSubscription
            })
          },
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

  return { auth, database, stripeClient, stripeRequests }
}

const findPreferredLocales = (
  stripeRequests: FakeStripeRequest[],
  route: string
) => {
  return stripeRequests
    .findLast((request) => {
      return request.route === route
    })
    ?.body.getAll('preferred_locales[0]')
}

const completeCheckout = async (locale: Locale) => {
  const { auth, database, stripeClient, stripeRequests } =
    createStripeCustomerTestAuth({ locale })
  const { user } = await auth.api.signUpEmail({ body: SIGN_UP_BODY })

  database.subscription.push({
    id: 'sub-row-incomplete',
    plan: PREMIUM_PLAN_NAME,
    referenceId: user.id,
    stripeCustomerId: 'cus_test',
    status: 'incomplete',
    seats: 1
  })

  const payload = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test',
        object: 'checkout.session',
        mode: 'subscription',
        subscription: 'sub_test',
        client_reference_id: user.id,
        metadata: { subscriptionId: 'sub-row-incomplete' }
      }
    }
  })

  const response = await auth.handler(
    new Request('http://localhost:3000/api/auth/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': stripeClient.webhooks.generateTestHeaderString({
          payload,
          secret: STRIPE_WEBHOOK_SECRET
        })
      },
      body: payload
    })
  )

  return { response, stripeRequests }
}

describe('signing up', () => {
  it.each(['fr', 'en'] as const)(
    'should create the Stripe customer with the %s locale of the User',
    async (locale) => {
      const { auth, stripeRequests } = createStripeCustomerTestAuth({
        locale
      })

      await auth.api.signUpEmail({ body: SIGN_UP_BODY })

      expect(
        findPreferredLocales(stripeRequests, 'POST /v1/customers')
      ).toStrictEqual([locale])
    }
  )

  it.each(['fr', 'en'] as const)(
    'should give the %s locale of the User to the Stripe customer found by email',
    async (locale) => {
      const { auth, stripeRequests } = createStripeCustomerTestAuth({
        locale,
        responses: {
          ...STRIPE_RESPONSES,
          'GET /v1/customers/search': CUSTOMER_FOUND_BY_EMAIL
        }
      })

      await auth.api.signUpEmail({ body: SIGN_UP_BODY })

      expect(
        findPreferredLocales(stripeRequests, 'POST /v1/customers/cus_test')
      ).toStrictEqual([locale])
    }
  )
})

describe('completing a checkout', () => {
  it.each(['fr', 'en'] as const)(
    'should give the %s locale of the User to the Stripe customer',
    async (locale) => {
      const { response, stripeRequests } = await completeCheckout(locale)

      expect(response.ok).toBe(true)
      expect(
        findPreferredLocales(stripeRequests, 'POST /v1/customers/cus_test')
      ).toStrictEqual([locale])
    }
  )
})
