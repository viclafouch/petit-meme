import type { Stripe } from 'stripe'
import type { MemeExportMode } from '~/constants/meme'
import { SECOND, THIRTY_DAYS_MS } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import {
  countDatesWithin,
  countCancellations,
  countNewSubscriptions,
  getRecapWindows,
  type RecapInvoice,
  type RecapSubscription,
  type RecapWindow,
  summarizeSubscribersAt,
  sumPaidCents,
  toMonthlyCents
} from '~/helpers/weekly-recap'
import { getStripeClient } from '~/lib/stripe.server'

const STRIPE_LIST_MAX_ITEMS = 10_000

type RecapWindows = ReturnType<typeof getRecapWindows>

const fromUnixSeconds = (seconds: number) => {
  return new Date(seconds * SECOND)
}

const fromNullableUnixSeconds = (seconds: number | null) => {
  return seconds === null ? null : fromUnixSeconds(seconds)
}

const toUnixSeconds = (date: Date) => {
  return Math.floor(date.getTime() / SECOND)
}

const toRecapSubscription = (
  subscription: Stripe.Subscription
): RecapSubscription => {
  const [item] = subscription.items.data
  const interval = item?.price.recurring?.interval ?? 'month'
  const cents = (item?.price.unit_amount ?? 0) * (item?.quantity ?? 1)

  return {
    customerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    interval,
    monthlyCents: toMonthlyCents(cents, interval),
    startedAt: fromUnixSeconds(subscription.start_date),
    canceledAt: fromNullableUnixSeconds(subscription.canceled_at),
    cancelAt: fromNullableUnixSeconds(subscription.cancel_at),
    endedAt: fromNullableUnixSeconds(subscription.ended_at)
  }
}

const toRecapInvoice = (invoice: Stripe.Invoice): RecapInvoice => {
  return {
    paidAt: fromUnixSeconds(
      invoice.status_transitions.paid_at ?? invoice.created
    ),
    amountPaidCents: invoice.amount_paid
  }
}

async function fetchStripeActivity(since: Date) {
  const stripe = getStripeClient()

  const [subscriptions, invoices, deletedCustomers] = await Promise.all([
    stripe.subscriptions
      .list({ status: 'all', limit: 100 })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS }),
    stripe.invoices
      .list({
        status: 'paid',
        created: {
          gte: toUnixSeconds(new Date(since.getTime() - THIRTY_DAYS_MS))
        },
        limit: 100
      })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS }),
    stripe.events
      .list({
        type: 'customer.deleted',
        created: { gte: toUnixSeconds(since) },
        limit: 100
      })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS })
  ])

  return {
    subscriptions: subscriptions.map(toRecapSubscription),
    invoices: invoices.map(toRecapInvoice),
    accountDeletions: deletedCustomers.map((event) => {
      return fromUnixSeconds(event.created)
    })
  }
}

const compareWindows = async (
  countIn: (window: RecapWindow) => Promise<number>,
  windows: RecapWindows
) => {
  const [current, previous] = await Promise.all([
    countIn(windows.current),
    countIn(windows.previous)
  ])

  return { current, previous }
}

const sumMemeActions = async (
  action: MemeExportMode,
  { start, end }: RecapWindow
) => {
  const result = await prismaClient.memeActionDaily.aggregate({
    where: { action, day: { gte: start, lt: end } },
    _sum: { count: true }
  })

  return result._sum.count ?? 0
}

async function fetchActivity(windows: RecapWindows) {
  const [signups, views, downloads, shares] = await Promise.all([
    compareWindows(({ start, end }) => {
      return prismaClient.user.count({
        where: { createdAt: { gte: start, lt: end } }
      })
    }, windows),
    compareWindows(({ start, end }) => {
      return prismaClient.memeViewDaily.count({
        where: { day: { gte: start, lt: end } }
      })
    }, windows),
    compareWindows((window) => {
      return sumMemeActions('download', window)
    }, windows),
    compareWindows((window) => {
      return sumMemeActions('share', window)
    }, windows)
  ])

  return { signups, views, downloads, shares }
}

export async function buildWeeklyRecap(now: Date) {
  const windows = getRecapWindows(now)
  const [stripeActivity, activity] = await Promise.all([
    fetchStripeActivity(windows.previous.start),
    fetchActivity(windows)
  ])
  const { subscriptions } = stripeActivity

  const compare = (measure: (window: RecapWindow) => number) => {
    return {
      current: measure(windows.current),
      previous: measure(windows.previous)
    }
  }

  const compareSubscribers = (
    pick: (summary: ReturnType<typeof summarizeSubscribersAt>) => number
  ) => {
    return compare(({ end }) => {
      return pick(summarizeSubscribersAt(subscriptions, end))
    })
  }

  return {
    window: windows.current,
    activeSubscriptions: {
      monthly: compareSubscribers(({ monthly }) => {
        return monthly
      }),
      yearly: compareSubscribers(({ yearly }) => {
        return yearly
      }),
      total: compareSubscribers(({ monthly, yearly }) => {
        return monthly + yearly
      }),
      mrrCents: compareSubscribers(({ mrrCents }) => {
        return mrrCents
      })
    },
    week: {
      newSubscriptions: compare((window) => {
        return countNewSubscriptions(subscriptions, window)
      }),
      cancellations: compare((window) => {
        return countCancellations(subscriptions, window)
      }),
      signups: activity.signups,
      accountDeletions: compare((window) => {
        return countDatesWithin(stripeActivity.accountDeletions, window)
      }),
      views: activity.views,
      downloads: activity.downloads,
      shares: activity.shares,
      collectedCents: compare((window) => {
        return sumPaidCents(stripeActivity.invoices, window)
      })
    }
  }
}

export type WeeklyRecap = Awaited<ReturnType<typeof buildWeeklyRecap>>
