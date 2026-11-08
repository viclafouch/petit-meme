import { describe, expect, it } from 'vitest'
import {
  countCheckouts,
  findArrivals,
  findDepartures,
  getRecapWindows,
  type RecapSubscription,
  summarizeSubscribersAt,
  sumPaidCents,
  toMonthlyCents
} from '~/helpers/weekly-recap'

const NOW = new Date('2026-11-08T08:00:00.000Z')
const MONTHLY_PRICE_CENTS = 399
const YEARLY_PRICE_CENTS = 2999
const YEARLY_MONTHLY_CENTS = toMonthlyCents(YEARLY_PRICE_CENTS, 'year')
const WINDOWS = getRecapWindows(NOW)

const buildSubscription = (
  overrides: Partial<RecapSubscription>
): RecapSubscription => {
  return {
    customerId: 'cus_a',
    status: 'active',
    interval: 'month',
    monthlyCents: MONTHLY_PRICE_CENTS,
    startedAt: new Date('2026-09-01T00:00:00.000Z'),
    canceledAt: null,
    cancelAt: null,
    endedAt: null,
    ...overrides
  }
}

describe('getRecapWindows', () => {
  it('should cover the seven full UTC days before the run day', () => {
    expect(WINDOWS.current).toStrictEqual({
      start: new Date('2026-11-01T00:00:00.000Z'),
      end: new Date('2026-11-08T00:00:00.000Z')
    })
    expect(WINDOWS.previous).toStrictEqual({
      start: new Date('2026-10-25T00:00:00.000Z'),
      end: new Date('2026-11-01T00:00:00.000Z')
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
        monthlyCents: YEARLY_MONTHLY_CENTS
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

describe('findArrivals', () => {
  it('should flag a customer who subscribed before as a comeback', () => {
    const subscriptions = [
      buildSubscription({
        status: 'canceled',
        startedAt: new Date('2026-03-01T00:00:00.000Z'),
        endedAt: new Date('2026-06-01T00:00:00.000Z')
      }),
      buildSubscription({ startedAt: new Date('2026-11-03T00:00:00.000Z') }),
      buildSubscription({
        customerId: 'cus_b',
        startedAt: new Date('2026-11-05T00:00:00.000Z')
      })
    ]

    const arrivals = findArrivals(subscriptions, WINDOWS.current)

    expect(
      arrivals.map(({ subscription, isComeback }) => {
        return { customerId: subscription.customerId, isComeback }
      })
    ).toStrictEqual([
      { customerId: 'cus_a', isComeback: true },
      { customerId: 'cus_b', isComeback: false }
    ])
  })

  it('should ignore an abandoned checkout', () => {
    const abandoned = buildSubscription({
      status: 'incomplete_expired',
      startedAt: new Date('2026-11-03T00:00:00.000Z')
    })

    expect(findArrivals([abandoned], WINDOWS.current)).toStrictEqual([])
  })
})

describe('findDepartures', () => {
  it('should list a cancellation announced or ended during the week', () => {
    const announced = buildSubscription({
      canceledAt: new Date('2026-11-06T00:00:00.000Z'),
      cancelAt: new Date('2026-11-29T00:00:00.000Z')
    })
    const ended = buildSubscription({
      status: 'canceled',
      canceledAt: new Date('2026-10-10T00:00:00.000Z'),
      endedAt: new Date('2026-11-02T00:00:00.000Z')
    })
    const older = buildSubscription({
      status: 'canceled',
      canceledAt: new Date('2026-09-10T00:00:00.000Z'),
      endedAt: new Date('2026-10-01T00:00:00.000Z')
    })

    expect(
      findDepartures([announced, ended, older], WINDOWS.current)
    ).toStrictEqual([announced, ended])
  })
})

describe('sumPaidCents', () => {
  it('should only sum the invoices paid during the window', () => {
    const invoices = [
      {
        paidAt: new Date('2026-11-02T10:00:00.000Z'),
        amountPaidCents: MONTHLY_PRICE_CENTS
      },
      {
        paidAt: new Date('2026-11-07T23:59:00.000Z'),
        amountPaidCents: YEARLY_PRICE_CENTS
      },
      {
        paidAt: new Date('2026-10-31T10:00:00.000Z'),
        amountPaidCents: MONTHLY_PRICE_CENTS
      }
    ]

    expect(sumPaidCents(invoices, WINDOWS.current)).toBe(
      MONTHLY_PRICE_CENTS + YEARLY_PRICE_CENTS
    )
  })
})

describe('countCheckouts', () => {
  it('should count the started and the paid checkouts of the window', () => {
    const checkouts = [
      { createdAt: new Date('2026-11-02T10:00:00.000Z'), isComplete: true },
      { createdAt: new Date('2026-11-03T10:00:00.000Z'), isComplete: false },
      { createdAt: new Date('2026-10-30T10:00:00.000Z'), isComplete: true }
    ]

    expect(countCheckouts(checkouts, WINDOWS.current)).toStrictEqual({
      started: 2,
      paid: 1
    })
  })
})
