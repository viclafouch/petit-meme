import { describe, expect, it } from 'vitest'
import {
  type BillingInvoice,
  type BillingSubscription,
  toMonthlyCents
} from '~/helpers/subscription'
import {
  countDatesWithin,
  countCancellations,
  getRecapWindows,
  summarizeSubscribersAt,
  tallyPaymentsWithin
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
      monthly: { count: 1, cents: MONTHLY_PRICE_CENTS },
      yearly: { count: 0, cents: 0 }
    })
  })

  it('should drop a subscription once it has ended', () => {
    const ended = buildSubscription({
      status: 'canceled',
      endedAt: new Date('2026-11-04T00:00:00.000Z')
    })

    expect(
      summarizeSubscribersAt([ended], WINDOWS.current.start).monthly.count
    ).toBe(1)
    expect(
      summarizeSubscribersAt([ended], WINDOWS.current.end).monthly.count
    ).toBe(0)
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
      monthly: { count: 0, cents: 0 },
      yearly: { count: 1, cents: YEARLY_MONTHLY_CENTS }
    })
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

describe('tallyPaymentsWithin', () => {
  it('should only tally the payments made during the window', () => {
    const invoices = [
      buildInvoice({ paidAt: new Date('2026-11-02T10:00:00.000Z') }),
      buildInvoice({
        paidAt: new Date('2026-11-07T23:59:00.000Z'),
        amountPaidCents: YEARLY_PRICE_CENTS
      }),
      buildInvoice({ paidAt: new Date('2026-10-31T10:00:00.000Z') })
    ]

    expect(tallyPaymentsWithin(invoices, WINDOWS.current)).toStrictEqual({
      count: 2,
      cents: MONTHLY_PRICE_CENTS + YEARLY_PRICE_CENTS
    })
  })

  it('should split first payments from renewals', () => {
    const invoices = [
      buildInvoice({ billingReason: 'subscription_create' }),
      buildInvoice({ billingReason: 'subscription_cycle' }),
      buildInvoice({ billingReason: 'subscription_cycle' }),
      buildInvoice({
        billingReason: 'subscription_update',
        amountPaidCents: YEARLY_PRICE_CENTS
      })
    ]

    expect(
      tallyPaymentsWithin(invoices, WINDOWS.current, 'subscription_create')
    ).toStrictEqual({ count: 1, cents: MONTHLY_PRICE_CENTS })
    expect(
      tallyPaymentsWithin(invoices, WINDOWS.current, 'subscription_cycle')
    ).toStrictEqual({
      count: 2,
      cents: MONTHLY_PRICE_CENTS + MONTHLY_PRICE_CENTS
    })
    expect(tallyPaymentsWithin(invoices, WINDOWS.current)).toStrictEqual({
      count: invoices.length,
      cents:
        MONTHLY_PRICE_CENTS +
        MONTHLY_PRICE_CENTS +
        MONTHLY_PRICE_CENTS +
        YEARLY_PRICE_CENTS
    })
  })

  it('should leave out invoices with nothing paid', () => {
    const free = buildInvoice({
      billingReason: 'subscription_create',
      amountPaidCents: 0
    })

    expect(tallyPaymentsWithin([free], WINDOWS.current)).toStrictEqual({
      count: 0,
      cents: 0
    })
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
