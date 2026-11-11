import type { Stripe } from 'stripe'
import type { Subscription } from '@better-auth/stripe'
import {
  type BillingPeriod,
  getBillingPeriodLabel,
  PREMIUM_PLAN_PRICING
} from '~/constants/plan'
import { MONTHS_IN_YEAR } from '~/constants/time'
import { formatDate } from '~/helpers/date'
import { formatCentsToEuros } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'

export type BillingSubscription = {
  id: string
  customerId: string
  status: Stripe.Subscription.Status
  interval: Stripe.Price.Recurring.Interval
  amountCents: number
  startedAt: Date
  canceledAt: Date | null
  cancelAt: Date | null
  cancelAtPeriodEnd: boolean
  endedAt: Date | null
  periodEnd: Date | null
}

export type BillingInvoice = {
  id: string
  subscriptionId: string | null
  paidAt: Date
  amountPaidCents: number
  billingReason: Stripe.Invoice.BillingReason | null
}

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing'
] as const satisfies readonly Subscription['status'][]

const NEVER_PAID_STATUSES = [
  'incomplete',
  'incomplete_expired'
] as const satisfies readonly Subscription['status'][]

const PAYMENT_FAILED_STATUSES = [
  'past_due',
  'unpaid',
  'paused'
] as const satisfies readonly Subscription['status'][]

const BILLING_PERIOD_REASONS = [
  'subscription_create',
  'subscription_cycle'
] as const satisfies readonly Stripe.Invoice.BillingReason[]

export const matchIsActiveSubscriptionStatus = (status: string) => {
  return ACTIVE_SUBSCRIPTION_STATUSES.some((activeStatus) => {
    return activeStatus === status
  })
}

type SubscriptionStatusParams = {
  status: string
}

export const matchHasBeenPaid = ({ status }: SubscriptionStatusParams) => {
  return !NEVER_PAID_STATUSES.some((neverPaidStatus) => {
    return neverPaidStatus === status
  })
}

const matchIsPaymentFailed = ({ status }: SubscriptionStatusParams) => {
  return PAYMENT_FAILED_STATUSES.some((paymentFailedStatus) => {
    return paymentFailedStatus === status
  })
}

type MatchIsPayingAtParams = Pick<
  BillingSubscription,
  'status' | 'startedAt' | 'endedAt'
>

export const matchIsPayingAt = (
  { status, startedAt, endedAt }: MatchIsPayingAtParams,
  date: Date
) => {
  const isPayingStatus =
    matchHasBeenPaid({ status }) && !matchIsPaymentFailed({ status })

  return (
    isPayingStatus && startedAt < date && (endedAt === null || endedAt > date)
  )
}

type BillingInterval = Stripe.Price.Recurring.Interval | null | undefined

export const matchIsYearlyInterval = (interval: BillingInterval) => {
  return interval === 'year'
}

const getIntervalMonthCount = (interval: BillingInterval) => {
  return matchIsYearlyInterval(interval) ? MONTHS_IN_YEAR : 1
}

export const toMonthlyCents = (cents: number, interval: BillingInterval) => {
  return cents / getIntervalMonthCount(interval)
}

export const getBillingPeriodFromInterval = (
  interval: BillingInterval
): BillingPeriod => {
  return matchIsYearlyInterval(interval) ? 'yearly' : 'monthly'
}

export const getSubscriptionPriceCents = (interval: BillingInterval) => {
  return PREMIUM_PLAN_PRICING[getBillingPeriodFromInterval(interval)]
    .priceInCents
}

type SubscriptionDisplayInfoParams = {
  billingInterval: BillingInterval
  locale: Locale
}

export const getSubscriptionDisplayInfo = ({
  billingInterval,
  locale
}: SubscriptionDisplayInfoParams) => {
  const billingPeriod = getBillingPeriodFromInterval(billingInterval)
  const formattedPrice = formatCentsToEuros(
    getSubscriptionPriceCents(billingInterval),
    { locale }
  )
  const periodLabel = getBillingPeriodLabel(billingPeriod)

  return {
    billingPeriod,
    displayPrice: `${formattedPrice}${periodLabel}`
  }
}

type SubscriptionSchedule = {
  cancelAtPeriodEnd?: boolean | null
  cancelAt?: Date | null
  endedAt?: Date | null
  periodEnd?: Date | null
}

export const matchIsCancellationPending = ({
  cancelAtPeriodEnd,
  cancelAt
}: SubscriptionSchedule) => {
  return Boolean(cancelAtPeriodEnd || cancelAt)
}

export type SubscriptionEnding = {
  kind: 'renews' | 'ends'
  date: Date | null
}

export const getSubscriptionEnding = (
  subscription: SubscriptionSchedule
): SubscriptionEnding => {
  if (subscription.endedAt) {
    return { kind: 'ends', date: subscription.endedAt }
  }

  if (matchIsCancellationPending(subscription)) {
    return {
      kind: 'ends',
      date: subscription.cancelAt ?? subscription.periodEnd ?? null
    }
  }

  return { kind: 'renews', date: subscription.periodEnd ?? null }
}

export type SubscriptionState = 'active' | 'ending' | 'failing' | 'ended'

export const getSubscriptionState = (
  subscription: SubscriptionStatusParams & SubscriptionSchedule
): SubscriptionState => {
  if (matchIsActiveSubscriptionStatus(subscription.status)) {
    return matchIsCancellationPending(subscription) ? 'ending' : 'active'
  }

  return matchIsPaymentFailed(subscription) ? 'failing' : 'ended'
}

export const matchIsPremiumState = (state: SubscriptionState) => {
  return state === 'active' || state === 'ending'
}

export const formatSubscriptionEnding = (
  { kind, date }: SubscriptionEnding,
  locale: Locale
) => {
  if (!date) {
    return null
  }

  const formattedDate = formatDate(new Date(date), locale)

  return kind === 'ends'
    ? m.settings_subscription_ends({ date: formattedDate }, { locale })
    : m.settings_subscription_renews({ date: formattedDate }, { locale })
}

export const sumPaidCents = (
  invoices: Pick<BillingInvoice, 'amountPaidCents'>[]
) => {
  return invoices.reduce((total, invoice) => {
    return total + invoice.amountPaidCents
  }, 0)
}

const matchOpensBillingPeriod = ({
  billingReason,
  amountPaidCents
}: BillingInvoice) => {
  return (
    amountPaidCents > 0 &&
    BILLING_PERIOD_REASONS.some((reason) => {
      return reason === billingReason
    })
  )
}

export const countPaidMonths = (
  subscriptions: Pick<BillingSubscription, 'id' | 'interval'>[],
  invoices: BillingInvoice[]
) => {
  const intervalBySubscriptionId = new Map(
    subscriptions.map((subscription) => {
      return [subscription.id, subscription.interval] as const
    })
  )

  return invoices.filter(matchOpensBillingPeriod).reduce((total, invoice) => {
    const interval =
      invoice.subscriptionId === null
        ? undefined
        : intervalBySubscriptionId.get(invoice.subscriptionId)

    return interval === undefined
      ? total
      : total + getIntervalMonthCount(interval)
  }, 0)
}

export const getCustomerSince = (
  subscriptions: Pick<BillingSubscription, 'status' | 'startedAt'>[]
) => {
  return subscriptions
    .filter(matchHasBeenPaid)
    .reduce<Date | null>((earliest, subscription) => {
      return earliest === null || subscription.startedAt < earliest
        ? subscription.startedAt
        : earliest
    }, null)
}
