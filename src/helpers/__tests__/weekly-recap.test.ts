import { describe, expect, it } from 'vitest'
import {
  type BillingInvoice,
  type BillingSubscription,
  toMonthlyCents
} from '~/helpers/subscription'
import {
  countDatesWithin,
  countCancellations,
  countNewSubscriptions,
  getRecapWindows,
  summarizeSubscribersAt,
  sumPaidCentsWithin
} from '~/helpers/weekly-recap'

const NOW = new Date('2026-11-08T08:00:00.000Z')
const MONTHLY_PRICE_CENTS = 399
const YEARLY_PRICE_CENTS = 2999
const YEARLY_MONTHLY_CENTS = toMonthlyCents(YEARLY_PRICE_CENTS, 'year')
const WINDOWS = getRecapWindows(NOW)

const buildSubscription = (
  overrides: Partial<BillingSubscription>
): BillingSubscription => {
  return {
    id: 'sub_a',
    customerId: 'cus_a',
    status: 'active',
    interval: 'month',
    amountCents: MONTHLY_PRICE_CENTS,
    startedAt: new Date('2026-09-01T00:00:00.000Z'),
    canceledAt: null,
    cancelAt: null,
    cancelAtPeriodEnd: false,
    endedAt: null,
    periodEnd: null,
    ...overrides
  }
}

const buildInvoice = (overrides: Partial<BillingInvoice>): BillingInvoice => {
  return {
    id: 'in_a',
    subscriptionId: 'sub_a',
    paidAt: new Date('2026-11-02T10:00:00.000Z'),
    amountPaidCents: MONTHLY_PRICE_CENTS,
    billingReason: 'subscription_cycle',
    ...overrides
  }
}

describe('getRecapWindows', () => {
  it('should cover Monday to Sunday when it runs on Sunday evening', () => {
    const sundayEvening = new Date('2026-11-08T21:00:00.000Z')

    const windows = getRecapWindows(sundayEvening)

    expect(windows.current).toStrictEqual({
      start: new Date('2026-11-02T00:00:00.000Z'),
      end: new Date('2026-11-09T00:00:00.000Z')
    })
    expect(windows.previous).toStrictEqual({
      start: new Date('2026-10-26T00:00:00.000Z'),
      end: new Date('2026-11-02T00:00:00.000Z')
    })
  })
})

describe('summarizeSubscribersAt', () => {
  it('should count a pending cancellation as paying until it ends', () => {
    const pendingCancellation = buildSubscription({
      canceledAt: new Date('2026-11-03T00:00:00.000Z'),
      cancelAt: new Date('2026-11-29T00:00:00.000Z')
    })

    const summary = summarizeSubscribersAt(
      [pendingCancellation],
      WINDOWS.current.end
    )

    expect(summary).toStrictEqual({
      monthly: 1,
      yearly: 0,
      mrrCents: MONTHLY_PRICE_CENTS
    })
  })

  it('should drop a subscription once it has ended', () => {
    const ended = buildSubscription({
      status: 'canceled',
      endedAt: new Date('2026-11-04T00:00:00.000Z')
    })

    expect(summarizeSubscribersAt([ended], WINDOWS.current.start).monthly).toBe(
      1
    )
    expect(summarizeSubscribersAt([ended], WINDOWS.current.end).monthly).toBe(0)
  })

  it('should leave out unpaid and abandoned subscriptions', () => {
    const subscriptions = [
      buildSubscription({ status: 'past_due' }),
      buildSubscription({ status: 'incomplete' }),
      buildSubscription({
        interval: 'year',
        amountCents: YEARLY_PRICE_CENTS
      })
    ]

    const summary = summarizeSubscribersAt(subscriptions, WINDOWS.current.end)

    expect(summary).toStrictEqual({
      monthly: 0,
      yearly: 1,
      mrrCents: YEARLY_MONTHLY_CENTS
    })
  })
})

describe('countNewSubscriptions', () => {
  it('should count the subscriptions started during the week', () => {
    const subscriptions = [
      buildSubscription({ startedAt: new Date('2026-11-03T00:00:00.000Z') }),
      buildSubscription({ startedAt: new Date('2026-10-20T00:00:00.000Z') })
    ]

    expect(countNewSubscriptions(subscriptions, WINDOWS.current)).toBe(1)
  })

  it('should ignore an abandoned checkout', () => {
    const abandoned = buildSubscription({
      status: 'incomplete_expired',
      startedAt: new Date('2026-11-03T00:00:00.000Z')
    })

    expect(countNewSubscriptions([abandoned], WINDOWS.current)).toBe(0)
  })
})

describe('countCancellations', () => {
  it('should count the cancellations announced during the week', () => {
    const announced = buildSubscription({
      canceledAt: new Date('2026-11-06T00:00:00.000Z'),
      cancelAt: new Date('2026-11-29T00:00:00.000Z')
    })
    const endedThisWeek = buildSubscription({
      status: 'canceled',
      canceledAt: new Date('2026-10-10T00:00:00.000Z'),
      endedAt: new Date('2026-11-04T00:00:00.000Z')
    })

    expect(
      countCancellations([announced, endedThisWeek], WINDOWS.current)
    ).toBe(1)
  })
})

describe('sumPaidCentsWithin', () => {
  it('should only sum the invoices paid during the window', () => {
    const invoices = [
      buildInvoice({ paidAt: new Date('2026-11-02T10:00:00.000Z') }),
      buildInvoice({
        paidAt: new Date('2026-11-07T23:59:00.000Z'),
        amountPaidCents: YEARLY_PRICE_CENTS
      }),
      buildInvoice({ paidAt: new Date('2026-10-31T10:00:00.000Z') })
    ]

    expect(sumPaidCentsWithin(invoices, WINDOWS.current)).toBe(
      MONTHLY_PRICE_CENTS + YEARLY_PRICE_CENTS
    )
  })
})

describe('countDatesWithin', () => {
  it('should count only the dates inside the window', () => {
    const deletions = [
      new Date('2026-11-01T00:00:00.000Z'),
      new Date('2026-11-07T23:59:00.000Z'),
      new Date('2026-11-08T00:00:00.000Z'),
      new Date('2026-10-31T23:59:00.000Z')
    ]

    expect(countDatesWithin(deletions, WINDOWS.current)).toBe(2)
  })
})
