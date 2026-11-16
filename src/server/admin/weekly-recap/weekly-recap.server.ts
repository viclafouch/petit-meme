import type { MemeExportMode } from '~/constants/meme'
import { THIRTY_DAYS_MS } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import {
  type Comparison,
  countDatesWithin,
  countCancellations,
  getRecapWindows,
  type RecapWindow,
  summarizeSubscribersAt,
  type Tally,
  type TallyComparison,
  tallyPaymentsWithin
} from '~/helpers/weekly-recap'
import {
  fromUnixSeconds,
  getStripeClient,
  toBillingInvoice,
  toBillingSubscription,
  toUnixSeconds
} from '~/server/platforms/stripe.server'

const STRIPE_LIST_MAX_ITEMS = 10_000

type RecapWindows = ReturnType<typeof getRecapWindows>

const fetchStripeActivity = async (since: Date) => {
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
    subscriptions: subscriptions.map(toBillingSubscription),
    invoices: invoices.map(toBillingInvoice),
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

const findActivity = async (windows: RecapWindows) => {
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

export const buildWeeklyRecap = async (now: Date) => {
  const windows = getRecapWindows(now)
  const [stripeActivity, activity] = await Promise.all([
    fetchStripeActivity(windows.previous.start),
    findActivity(windows)
  ])
  const { subscriptions, invoices } = stripeActivity

  const compare = (measure: (window: RecapWindow) => number): Comparison => {
    return {
      current: measure(windows.current),
      previous: measure(windows.previous)
    }
  }

  const compareTally = (
    measure: (window: RecapWindow) => Tally
  ): TallyComparison => {
    const current = measure(windows.current)
    const previous = measure(windows.previous)

    return {
      count: { current: current.count, previous: previous.count },
      cents: { current: current.cents, previous: previous.cents }
    }
  }

  const compareSubscribers = (
    pick: (summary: ReturnType<typeof summarizeSubscribersAt>) => Tally
  ) => {
    return compareTally(({ end }) => {
      return pick(summarizeSubscribersAt(subscriptions, end))
    })
  }

  return {
    window: windows.current,
    subscribers: {
      monthly: compareSubscribers(({ monthly }) => {
        return monthly
      }),
      yearly: compareSubscribers(({ yearly }) => {
        return yearly
      }),
      total: compareSubscribers(({ monthly, yearly }) => {
        return {
          count: monthly.count + yearly.count,
          cents: monthly.cents + yearly.cents
        }
      })
    },
    payments: {
      newSubscriptions: compareTally((window) => {
        return tallyPaymentsWithin(invoices, window, 'subscription_create')
      }),
      renewals: compareTally((window) => {
        return tallyPaymentsWithin(invoices, window, 'subscription_cycle')
      }),
      total: compareTally((window) => {
        return tallyPaymentsWithin(invoices, window)
      })
    },
    activity: {
      cancellations: compare((window) => {
        return countCancellations(subscriptions, window)
      }),
      signups: activity.signups,
      accountDeletions: compare((window) => {
        return countDatesWithin(stripeActivity.accountDeletions, window)
      }),
      views: activity.views,
      downloads: activity.downloads,
      shares: activity.shares
    }
  }
}

export type WeeklyRecap = Awaited<ReturnType<typeof buildWeeklyRecap>>
