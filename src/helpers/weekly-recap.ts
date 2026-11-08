import type { Stripe } from 'stripe'
import { DAY, DAYS_PER_WEEK, MONTHS_IN_YEAR } from '~/constants/time'
import { formatDate, truncateToUtcDay } from '~/helpers/date'

export type RecapWindow = {
  start: Date
  end: Date
}

export type Comparison = {
  current: number
  previous: number
}

export type RecapSubscription = {
  customerId: string
  status: Stripe.Subscription.Status
  interval: Stripe.Price.Recurring.Interval
  monthlyCents: number
  startedAt: Date
  canceledAt: Date | null
  cancelAt: Date | null
  endedAt: Date | null
}

export type RecapInvoice = {
  paidAt: Date
  amountPaidCents: number
}

const NEVER_PAID_STATUSES = [
  'incomplete',
  'incomplete_expired'
] as const satisfies Stripe.Subscription.Status[]

const NOT_PAYING_STATUSES = [
  ...NEVER_PAID_STATUSES,
  'past_due',
  'unpaid',
  'paused'
] as const satisfies Stripe.Subscription.Status[]

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

export const toMonthlyCents = (
  cents: number,
  interval: Stripe.Price.Recurring.Interval
) => {
  return interval === 'year' ? cents / MONTHS_IN_YEAR : cents
}

const matchIsPayingAt = (subscription: RecapSubscription, date: Date) => {
  const isPayingStatus = !NOT_PAYING_STATUSES.some((status) => {
    return status === subscription.status
  })

  return (
    isPayingStatus &&
    subscription.startedAt < date &&
    (subscription.endedAt === null || subscription.endedAt > date)
  )
}

const matchHasBeenPaid = (subscription: RecapSubscription) => {
  return !NEVER_PAID_STATUSES.some((status) => {
    return status === subscription.status
  })
}

export const summarizeSubscribersAt = (
  subscriptions: RecapSubscription[],
  date: Date
) => {
  const paying = subscriptions.filter((subscription) => {
    return matchIsPayingAt(subscription, date)
  })

  return {
    monthly: paying.filter((subscription) => {
      return subscription.interval !== 'year'
    }).length,
    yearly: paying.filter((subscription) => {
      return subscription.interval === 'year'
    }).length,
    mrrCents: paying.reduce((total, subscription) => {
      return total + subscription.monthlyCents
    }, 0)
  }
}

export const countNewSubscriptions = (
  subscriptions: RecapSubscription[],
  window: RecapWindow
) => {
  return subscriptions.filter((subscription) => {
    return (
      matchHasBeenPaid(subscription) &&
      matchIsWithinWindow(subscription.startedAt, window)
    )
  }).length
}

export const countCancellations = (
  subscriptions: RecapSubscription[],
  window: RecapWindow
) => {
  return subscriptions.filter((subscription) => {
    return (
      matchHasBeenPaid(subscription) &&
      matchIsWithinWindow(subscription.canceledAt, window)
    )
  }).length
}

export const sumPaidCents = (invoices: RecapInvoice[], window: RecapWindow) => {
  return invoices
    .filter((invoice) => {
      return matchIsWithinWindow(invoice.paidAt, window)
    })
    .reduce((total, invoice) => {
      return total + invoice.amountPaidCents
    }, 0)
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
