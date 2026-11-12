import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { convertSetCookieToCookie } from 'better-auth/test'
import { Stripe } from 'stripe'
import { describe, expect, it } from 'vitest'
import { stripe, type Subscription } from '@better-auth/stripe'
import { USER_NAME_MAX_LENGTH } from '~/constants/auth'
import { HTTP_STATUS } from '~/constants/http'
import {
  ALREADY_SUBSCRIBED_ERROR_CODE,
  PREMIUM_PLAN_NAME
} from '~/constants/plan'
import { STRIPE_API_VERSION } from '~/constants/stripe'
import { matchIsOwnKey } from '~/helpers/object'
import type { Locale } from '~/paraglide/runtime'
import { guardAuthEndpoints } from '~/server/auth/auth-hooks.server'
import {
  buildStripeCustomerCreateParams,
  giveUserLocaleToStripeCustomer
} from '~/server/subscription/stripe-customer.server'

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

const STRIPE_WEBHOOK_SECRET = 'whsec_test'

const PERIOD_START_UNIX_SECONDS = 1_790_000_000

const PERIOD_END_UNIX_SECONDS = 1_792_592_000

const STRIPE_RESPONSES = {
  'GET /v1/customers/search': {
    object: 'search_result',
    data: [],
    has_more: false
  },
  'POST /v1/customers': { id: 'cus_test', object: 'customer', metadata: {} },
  'GET /v1/customers/cus_test': {
    id: 'cus_test',
    object: 'customer',
    email: VALID_SIGN_UP_BODY.email,
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
  },
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

type StripeRequest = { route: string; body: URLSearchParams }

const toStripeRoute = (input: string | URL | Request, init?: RequestInit) => {
  const { pathname } = new URL(input instanceof Request ? input.url : input)

  return `${init?.method ?? 'GET'} ${pathname}`
}

const respondLikeStripe = async (
  input: string | URL | Request,
  init?: RequestInit
) => {
  const route = toStripeRoute(input, init)

  if (!matchIsOwnKey(STRIPE_RESPONSES, route)) {
    return Response.json(
      { error: { message: `No fake for ${route}` } },
      { status: HTTP_STATUS.NOT_FOUND }
    )
  }

  return Response.json(STRIPE_RESPONSES[route])
}

type CreateSubscriptionTestAuthParams = { locale: Locale }

const createSubscriptionTestAuth = ({
  locale
}: CreateSubscriptionTestAuthParams) => {
  const stripeRequests: StripeRequest[] = []
  const subscription: Record<string, unknown>[] = []
  const database = {
    user: [],
    session: [],
    account: [],
    verification: [],
    subscription
  }
  const stripeClient = new Stripe('sk_test_fake', {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      stripeRequests.push({
        route: toStripeRoute(input, init),
        body: new URLSearchParams(
          typeof init?.body === 'string' ? init.body : ''
        )
      })

      return respondLikeStripe(input, init)
    })
  })
  const auth = betterAuth({
    secret: 'auth-guard-test-secret-0000000001',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    hooks: { before: guardAuthEndpoints },
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, input: false }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            return { data: { ...user, locale } }
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
        subscription: {
          enabled: true,
          onSubscriptionComplete: async (
            { subscription: completedSubscription, stripeSubscription },
            endpointContext
          ) => {
            await giveUserLocaleToStripeCustomer({
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

const findCustomerLocaleUpdate = (stripeRequests: StripeRequest[]) => {
  return stripeRequests.findLast(({ route }) => {
    return route === 'POST /v1/customers/cus_test'
  })
}

const completeCheckout = async (locale: Locale) => {
  const { auth, database, stripeClient, stripeRequests } =
    createSubscriptionTestAuth({ locale })
  const { user } = await auth.api.signUpEmail({ body: VALID_SIGN_UP_BODY })

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

describe('creating the Stripe customer', () => {
  it.each(['fr', 'en'] as const)(
    'should give the %s locale of the User to the Stripe customer',
    async (locale) => {
      const { auth, stripeRequests } = createSubscriptionTestAuth({ locale })

      await auth.api.signUpEmail({ body: VALID_SIGN_UP_BODY })

      const customerCreation = stripeRequests.find(({ route }) => {
        return route === 'POST /v1/customers'
      })

      expect(
        customerCreation?.body.getAll('preferred_locales[0]')
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
        findCustomerLocaleUpdate(stripeRequests)?.body.getAll(
          'preferred_locales[0]'
        )
      ).toStrictEqual([locale])
    }
  )
})

const signUpWithSubscriptions = async (statuses: Subscription['status'][]) => {
  const { auth, database } = createSubscriptionTestAuth({ locale: 'fr' })
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
