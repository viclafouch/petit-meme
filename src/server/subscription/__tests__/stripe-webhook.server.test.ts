import type { Stripe } from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaClient } from '~/db/client.server'
import type { Locale } from '~/paraglide/runtime'
import { createFakeStripeClient } from '~/server/platforms/__tests__/stripe.fakes'
import { sendEmailInBackground } from '~/server/platforms/resend.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import {
  notifyPaymentFailed,
  notifySubscriptionEnded
} from '~/server/subscription/stripe-webhook.server'
import { FRENCH_USER } from '~/server/user/__tests__/user.fakes'

vi.mock(import('~/server/platforms/stripe.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    getStripeClient: vi.fn<typeof getStripeClient>()
  }
})

vi.mock(import('~/server/platforms/resend.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    sendEmailInBackground: vi.fn<typeof sendEmailInBackground>()
  }
})

const BILLING_PORTAL_URL = 'https://billing.stripe.com/p/session/test'

type BuildPaymentFailedEventParams = {
  eventId: string
  invoiceId: string
  attemptCount: number
}

const buildPaymentFailedEvent = ({
  eventId,
  invoiceId,
  attemptCount
}: BuildPaymentFailedEventParams) => {
  return {
    id: eventId,
    data: {
      object: {
        id: invoiceId,
        customer: 'cus_test',
        attempt_count: attemptCount
      }
    }
  }
}

const stubUser = (locale: Locale) => {
  const user = { ...FRENCH_USER, locale }

  vi.spyOn(prismaClient.user, 'findFirst').mockResolvedValue(user)
  vi.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(user)
}

const buildEndedSubscription = (
  reason: Stripe.Subscription.CancellationDetails.Reason | null
) => {
  return {
    id: 'sub_test',
    cancellation_details: {
      comment: null,
      feedback: null,
      feedback_option: null,
      reason
    }
  }
}

const stubBillingPortal = () => {
  const { stripeClient } = createFakeStripeClient({
    responses: {
      'POST /v1/billing_portal/sessions': {
        id: 'bps_test',
        object: 'billing_portal.session',
        url: BILLING_PORTAL_URL
      }
    }
  })

  vi.mocked(getStripeClient).mockReturnValue(stripeClient)
}

describe('a failed invoice payment', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(sendEmailInBackground).mockClear()
    stubBillingPortal()
  })

  it.each([
    ['fr', 'Échec de paiement pour ton abonnement Petit Meme'],
    ['en', 'Payment failed for your Petit Meme subscription']
  ] as const)(
    'should send the %s payment failed email on the first failed attempt',
    async (locale, subject) => {
      stubUser(locale)

      await notifyPaymentFailed(
        buildPaymentFailedEvent({
          eventId: 'evt_first',
          invoiceId: 'in_renewal',
          attemptCount: 1
        })
      )

      expect(sendEmailInBackground).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ to: 'alan@example.test', subject })
      )
    }
  )

  it('should send nothing on a retry of the same invoice', async () => {
    stubUser('fr')

    await notifyPaymentFailed(
      buildPaymentFailedEvent({
        eventId: 'evt_retry',
        invoiceId: 'in_renewal',
        attemptCount: 2
      })
    )

    expect(sendEmailInBackground).not.toHaveBeenCalled()
  })

  it('should send it again when the next invoice fails', async () => {
    stubUser('fr')

    await notifyPaymentFailed(
      buildPaymentFailedEvent({
        eventId: 'evt_first',
        invoiceId: 'in_renewal',
        attemptCount: 1
      })
    )
    await notifyPaymentFailed(
      buildPaymentFailedEvent({
        eventId: 'evt_next_period',
        invoiceId: 'in_next_renewal',
        attemptCount: 1
      })
    )

    const idempotencyKeys = vi
      .mocked(sendEmailInBackground)
      .mock.calls.map(([params]) => {
        return params.idempotencyKey
      })

    expect(sendEmailInBackground).toHaveBeenCalledTimes(2)
    expect(new Set(idempotencyKeys).size).toBe(2)
  })
})

describe('a subscription that ends', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(sendEmailInBackground).mockClear()
  })

  it.each([
    ['fr', 'Ton abonnement Premium Petit Meme a pris fin'],
    ['en', 'Your Petit Meme Premium subscription has ended']
  ] as const)(
    'should send the %s subscription ended email when the payment never went through',
    async (locale, subject) => {
      stubUser(locale)

      await notifySubscriptionEnded({
        userId: 'user-id',
        stripeSubscription: buildEndedSubscription('payment_failed')
      })

      expect(sendEmailInBackground).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ to: 'alan@example.test', subject })
      )
    }
  )

  it.each(['cancellation_requested', 'payment_disputed', null] as const)(
    'should send nothing when the subscription ends for the %s reason',
    async (reason) => {
      stubUser('fr')

      await notifySubscriptionEnded({
        userId: 'user-id',
        stripeSubscription: buildEndedSubscription(reason)
      })

      expect(sendEmailInBackground).not.toHaveBeenCalled()
    }
  )
})
