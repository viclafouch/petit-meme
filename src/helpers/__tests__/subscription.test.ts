import { describe, expect, it } from 'vitest'
import type { Subscription } from '@better-auth/stripe'
import {
  type BillingInvoice,
  type BillingSubscription,
  countPaidMonths,
  getBillingPeriodFromInterval,
  getCustomerSince,
  getSubscriptionEnding,
  getSubscriptionState,
  matchIsCancellationPending
} from '~/helpers/subscription'

describe('getBillingPeriodFromInterval', () => {
  it('should bill a yearly Stripe interval by the year', () => {
    const billingPeriod = getBillingPeriodFromInterval('year')

    expect(billingPeriod).toBe('yearly')
  })

  it('should bill a monthly Stripe interval by the month', () => {
    const billingPeriod = getBillingPeriodFromInterval('month')

    expect(billingPeriod).toBe('monthly')
  })

  it('should bill a weekly Stripe interval by the month', () => {
    const billingPeriod = getBillingPeriodFromInterval('week')

    expect(billingPeriod).toBe('monthly')
  })

  it('should bill a subscription without an interval by the month', () => {
    const incompleteSubscription: Pick<Subscription, 'billingInterval'> = {}

    const billingPeriod = getBillingPeriodFromInterval(
      incompleteSubscription.billingInterval
    )

    expect(billingPeriod).toBe('monthly')
  })
})

describe('matchIsCancellationPending', () => {
  it('should read a cancellation at period end as pending', () => {
    const isPending = matchIsCancellationPending({
      cancelAtPeriodEnd: true,
      cancelAt: null
    })

    expect(isPending).toBe(true)
  })

  it('should read a portal cancellation with a cancel date as pending', () => {
    const isPending = matchIsCancellationPending({
      cancelAtPeriodEnd: false,
      cancelAt: new Date('2026-12-01T00:00:00.000Z')
    })

    expect(isPending).toBe(true)
  })

  it('should read a restored subscription as renewing', () => {
    const isPending = matchIsCancellationPending({
      cancelAtPeriodEnd: false,
      cancelAt: null
    })

    expect(isPending).toBe(false)
  })
})

const PERIOD_END = new Date('2026-12-01T00:00:00.000Z')

describe('getSubscriptionEnding', () => {
  it('should end a portal cancellation on its cancel date', () => {
    const ending = getSubscriptionEnding({
      cancelAtPeriodEnd: false,
      cancelAt: new Date('2026-11-20T00:00:00.000Z'),
      periodEnd: PERIOD_END
    })

    expect(ending).toStrictEqual({
      kind: 'ends',
      date: new Date('2026-11-20T00:00:00.000Z')
    })
  })

  it('should end a cancellation at period end with the billing period', () => {
    const ending = getSubscriptionEnding({
      cancelAtPeriodEnd: true,
      cancelAt: null,
      periodEnd: PERIOD_END
    })

    expect(ending).toStrictEqual({ kind: 'ends', date: PERIOD_END })
  })

  it('should renew a restored subscription at the end of its billing period', () => {
    const ending = getSubscriptionEnding({
      cancelAtPeriodEnd: false,
      cancelAt: null,
      periodEnd: PERIOD_END
    })

    expect(ending).toStrictEqual({ kind: 'renews', date: PERIOD_END })
  })

  it('should end an ended subscription on the day it ended', () => {
    const ending = getSubscriptionEnding({
      cancelAtPeriodEnd: true,
      cancelAt: null,
      endedAt: new Date('2026-04-10T00:00:00.000Z'),
      periodEnd: PERIOD_END
    })

    expect(ending).toStrictEqual({
      kind: 'ends',
      date: new Date('2026-04-10T00:00:00.000Z')
    })
  })
})

const buildInvoice = (overrides: Partial<BillingInvoice>): BillingInvoice => {
  return {
    id: 'in_a',
    subscriptionId: 'sub_monthly',
    paidAt: new Date('2026-01-10T00:00:00.000Z'),
    amountPaidCents: 399,
    billingReason: 'subscription_cycle',
    ...overrides
  }
}

const SUBSCRIPTIONS = [
  { id: 'sub_monthly', interval: 'month' },
  { id: 'sub_yearly', interval: 'year' }
] as const satisfies readonly Pick<BillingSubscription, 'id' | 'interval'>[]

const FOUR_MONTHLY_AND_ONE_YEARLY_PAID_MONTHS = 16

describe('countPaidMonths', () => {
  it('should count one month per monthly invoice and twelve per yearly invoice', () => {
    const invoices = [
      buildInvoice({ id: 'in_1', billingReason: 'subscription_create' }),
      buildInvoice({ id: 'in_2' }),
      buildInvoice({ id: 'in_3' }),
      buildInvoice({ id: 'in_4' }),
      buildInvoice({
        id: 'in_5',
        subscriptionId: 'sub_yearly',
        amountPaidCents: 2999,
        billingReason: 'subscription_create'
      })
    ]

    expect(countPaidMonths([...SUBSCRIPTIONS], invoices)).toBe(
      FOUR_MONTHLY_AND_ONE_YEARLY_PAID_MONTHS
    )
  })

  it('should leave out free invoices, prorations and invoices outside a subscription', () => {
    const invoices = [
      buildInvoice({ id: 'in_free', amountPaidCents: 0 }),
      buildInvoice({
        id: 'in_proration',
        billingReason: 'subscription_update'
      }),
      buildInvoice({ id: 'in_manual', subscriptionId: null })
    ]

    expect(countPaidMonths([...SUBSCRIPTIONS], invoices)).toBe(0)
  })
})

describe('getCustomerSince', () => {
  it('should start at the first paid subscription', () => {
    const customerSince = getCustomerSince([
      {
        status: 'incomplete_expired',
        startedAt: new Date('2025-06-01T00:00:00.000Z')
      },
      { status: 'active', startedAt: new Date('2026-09-01T00:00:00.000Z') },
      { status: 'canceled', startedAt: new Date('2026-01-10T00:00:00.000Z') }
    ])

    expect(customerSince).toStrictEqual(new Date('2026-01-10T00:00:00.000Z'))
  })

  it('should have no start without a paid subscription', () => {
    const customerSince = getCustomerSince([
      { status: 'incomplete', startedAt: new Date('2026-06-01T00:00:00.000Z') }
    ])

    expect(customerSince).toBeNull()
  })
})

describe('getSubscriptionState', () => {
  it('should read a paying subscription without cancellation as active', () => {
    expect(getSubscriptionState({ status: 'active', cancelAt: null })).toBe(
      'active'
    )
  })

  it('should read a cancelled subscription still in its paid period as ending', () => {
    expect(
      getSubscriptionState({
        status: 'active',
        cancelAtPeriodEnd: false,
        cancelAt: PERIOD_END
      })
    ).toBe('ending')
  })

  it('should read a subscription Stripe is still trying to charge as failing', () => {
    expect(getSubscriptionState({ status: 'past_due' })).toBe('failing')
  })

  it('should read a subscription past its last paid period as ended', () => {
    expect(
      getSubscriptionState({ status: 'canceled', endedAt: PERIOD_END })
    ).toBe('ended')
  })
})
