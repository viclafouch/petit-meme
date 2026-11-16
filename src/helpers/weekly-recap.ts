import type { Stripe } from 'stripe'
import { DAY, DAYS_PER_WEEK } from '~/constants/time'
import { formatDate, truncateToUtcDay } from '~/helpers/date'
import {
  type BillingInvoice,
  type BillingSubscription,
  matchHasBeenPaid,
  matchIsPayingAt,
  matchIsYearlyInterval,
  sumPaidCents,
  toMonthlyCents
} from '~/helpers/subscription'

export type RecapWindow = {
  start: Date
  end: Date
}

export type Comparison = {
  current: number
  previous: number
}

export type Tally = {
  count: number
  cents: number
}

export type TallyComparison = Record<keyof Tally, Comparison>

const WEEK = DAYS_PER_WEEK * DAY

export const getRecapWindows = (now: Date) => {
  const end = new Date(truncateToUtcDay(now).getTime() + DAY)
  const start = new Date(end.getTime() - WEEK)

  return {
    current: { start, end },
    previous: { start: new Date(start.getTime() - WEEK), end: start }
  } satisfies Record<string, RecapWindow>
}

const matchIsWithinWindow = (
  date: Date | null,
  { start, end }: RecapWindow
) => {
  return date !== null && date >= start && date < end
}

const tallySubscribers = (subscriptions: BillingSubscription[]): Tally => {
  return {
    count: subscriptions.length,
    cents: subscriptions.reduce((total, subscription) => {
      return (
        total + toMonthlyCents(subscription.amountCents, subscription.interval)
      )
    }, 0)
  }
}

export const summarizeSubscribersAt = (
  subscriptions: BillingSubscription[],
  date: Date
) => {
  const paying = subscriptions.filter((subscription) => {
    return matchIsPayingAt(subscription, date)
  })

  return {
    monthly: tallySubscribers(
      paying.filter((subscription) => {
        return !matchIsYearlyInterval(subscription.interval)
      })
    ),
    yearly: tallySubscribers(
      paying.filter((subscription) => {
        return matchIsYearlyInterval(subscription.interval)
      })
    )
  }
}

export const tallyPaymentsWithin = (
  invoices: BillingInvoice[],
  window: RecapWindow,
  billingReason?: Stripe.Invoice.BillingReason
): Tally => {
  const payments = invoices.filter((invoice) => {
    return (
      invoice.amountPaidCents > 0 &&
      matchIsWithinWindow(invoice.paidAt, window) &&
      (billingReason === undefined || invoice.billingReason === billingReason)
    )
  })

  return { count: payments.length, cents: sumPaidCents(payments) }
}

export const countCancellations = (
  subscriptions: BillingSubscription[],
  window: RecapWindow
) => {
  return subscriptions.filter((subscription) => {
    return (
      matchHasBeenPaid(subscription) &&
      matchIsWithinWindow(subscription.canceledAt, window)
    )
  }).length
}

export const countDatesWithin = (dates: Date[], window: RecapWindow) => {
  return dates.filter((date) => {
    return matchIsWithinWindow(date, window)
  }).length
}

const PERIOD_START_OPTIONS = {
  day: 'numeric',
  month: 'long'
} as const satisfies Intl.DateTimeFormatOptions

const PERIOD_END_OPTIONS = {
  ...PERIOD_START_OPTIONS,
  year: 'numeric'
} as const satisfies Intl.DateTimeFormatOptions

export const getWeeklyRecapPeriodLabel = ({ start, end }: RecapWindow) => {
  const lastDay = new Date(end.getTime() - DAY)

  return `du ${formatDate(start, 'fr', PERIOD_START_OPTIONS)} au ${formatDate(lastDay, 'fr', PERIOD_END_OPTIONS)}`
}
