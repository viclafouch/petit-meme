import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import type { User } from '~/db/generated/prisma/client'
import {
  createFakeStripeClient,
  type FakeStripeFailure
} from '~/server/platforms/__tests__/stripe.fakes'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { FRENCH_USER } from '~/server/user/__tests__/user.fakes'
import { syncUserLocale } from '~/server/user/user.server'

vi.mock(import('~/server/platforms/stripe.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    getStripeClient: vi.fn<typeof getStripeClient>()
  }
})

const CUSTOMER_LOCALE_ROUTE = 'POST /v1/customers/cus_test'

const STRIPE_OUTAGE = {
  status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  type: 'api_error',
  code: 'api_error'
} as const satisfies FakeStripeFailure

const MISSING_CUSTOMER = {
  status: HTTP_STATUS.NOT_FOUND,
  type: 'invalid_request_error',
  code: 'resource_missing'
} as const satisfies FakeStripeFailure

const stubUser = (user: User) => {
  vi.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(user)

  return vi.spyOn(prismaClient.user, 'update').mockResolvedValue(user)
}

const stubStripe = (failure?: FakeStripeFailure) => {
  const fake = createFakeStripeClient({
    responses: {
      [CUSTOMER_LOCALE_ROUTE]: { id: 'cus_test', object: 'customer' }
    },
    failures: failure ? { [CUSTOMER_LOCALE_ROUTE]: failure } : {}
  })

  vi.mocked(getStripeClient).mockReturnValue(fake.stripeClient)

  return fake
}

describe('syncing the User locale', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should give the new locale to the Stripe customer, then store it', async () => {
    const userUpdate = stubUser(FRENCH_USER)
    const { stripeRequests } = stubStripe()

    await syncUserLocale({ userId: FRENCH_USER.id, locale: 'en' })

    expect(
      stripeRequests.at(-1)?.body.getAll('preferred_locales[0]')
    ).toStrictEqual(['en'])
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: FRENCH_USER.id },
      data: { locale: 'en' }
    })
  })

  it('should keep the old locale while Stripe fails, so the next sync retries', async () => {
    const userUpdate = stubUser(FRENCH_USER)
    stubStripe(STRIPE_OUTAGE)

    await syncUserLocale({ userId: FRENCH_USER.id, locale: 'en' })

    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('should store the new locale when the Stripe customer is missing', async () => {
    const userUpdate = stubUser(FRENCH_USER)
    stubStripe(MISSING_CUSTOMER)

    await syncUserLocale({ userId: FRENCH_USER.id, locale: 'en' })

    expect(userUpdate).toHaveBeenCalledTimes(1)
  })

  it('should store the new locale of a User without a Stripe customer', async () => {
    const userUpdate = stubUser({ ...FRENCH_USER, stripeCustomerId: null })
    const { stripeRequests } = stubStripe()

    await syncUserLocale({ userId: FRENCH_USER.id, locale: 'en' })

    expect(stripeRequests).toStrictEqual([])
    expect(userUpdate).toHaveBeenCalledTimes(1)
  })

  it('should leave Stripe and the database alone when the locale is the same', async () => {
    const userUpdate = stubUser(FRENCH_USER)
    const { stripeRequests } = stubStripe()

    await syncUserLocale({ userId: FRENCH_USER.id, locale: 'fr' })

    expect(stripeRequests).toStrictEqual([])
    expect(userUpdate).not.toHaveBeenCalled()
  })
})
