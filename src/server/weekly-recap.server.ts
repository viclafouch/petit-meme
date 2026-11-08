import type { Stripe } from 'stripe'
import type { MemeExportMode } from '~/constants/meme'
import { SECOND, THIRTY_DAYS_MS } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import { SITE_URL } from '~/emails/constants'
import {
  countCheckouts,
  findArrivals,
  findDepartures,
  getRecapWindows,
  matchHasBeenPaid,
  type RecapCheckout,
  type RecapInvoice,
  type RecapSubscription,
  type RecapWindow,
  summarizeSubscribersAt,
  sumPaidCents,
  toMonthlyCents
} from '~/helpers/weekly-recap'
import { getStripeClient } from '~/lib/stripe.server'

const STRIPE_LIST_MAX_ITEMS = 10_000
const TOP_MEMES_COUNT = 5

const PROVIDER_LABELS = new Map([
  ['credential', 'Email'],
  ['twitter', 'Twitter'],
  ['discord', 'Discord']
])

const fromUnixSeconds = (seconds: number) => {
  return new Date(seconds * SECOND)
}

const fromNullableUnixSeconds = (seconds: number | null) => {
  return seconds === null ? null : fromUnixSeconds(seconds)
}

const getCustomerId = (customer: Stripe.Subscription['customer']) => {
  return typeof customer === 'string' ? customer : customer.id
}

const getCustomerEmail = (customer: Stripe.Subscription['customer']) => {
  if (typeof customer === 'string' || customer.deleted) {
    return null
  }

  return customer.email
}

const toRecapSubscription = (
  subscription: Stripe.Subscription
): RecapSubscription => {
  const [item] = subscription.items.data
  const interval = item?.price.recurring?.interval ?? 'month'
  const cents = (item?.price.unit_amount ?? 0) * (item?.quantity ?? 1)

  return {
    customerId: getCustomerId(subscription.customer),
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

const toRecapCheckout = (session: Stripe.Checkout.Session): RecapCheckout => {
  return {
    createdAt: fromUnixSeconds(session.created),
    isComplete: session.status === 'complete'
  }
}

const toUnixSeconds = (date: Date) => {
  return Math.floor(date.getTime() / SECOND)
}

async function fetchStripeActivity(since: Date) {
  const stripe = getStripeClient()
  const createdSince = { gte: toUnixSeconds(since) }
  const invoicesCreatedSince = {
    gte: toUnixSeconds(new Date(since.getTime() - THIRTY_DAYS_MS))
  }

  const [subscriptions, invoices, checkouts] = await Promise.all([
    stripe.subscriptions
      .list({ status: 'all', limit: 100, expand: ['data.customer'] })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS }),
    stripe.invoices
      .list({ status: 'paid', created: invoicesCreatedSince, limit: 100 })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS }),
    stripe.checkout.sessions
      .list({ created: createdSince, limit: 100 })
      .autoPagingToArray({ limit: STRIPE_LIST_MAX_ITEMS })
  ])

  return {
    subscriptions,
    invoices: invoices.map(toRecapInvoice),
    checkouts: checkouts
      .filter((session) => {
        return session.mode === 'subscription'
      })
      .map(toRecapCheckout)
  }
}

async function fetchUsersByCustomerId(customerIds: string[]) {
  const users = await prismaClient.user.findMany({
    where: { stripeCustomerId: { in: customerIds } },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      accounts: { select: { providerId: true } }
    }
  })

  return new Map(
    users.map((user) => {
      return [user.stripeCustomerId, user] as const
    })
  )
}

const compareWindows = async (
  countIn: (window: RecapWindow) => Promise<number>,
  windows: ReturnType<typeof getRecapWindows>
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

async function fetchUsage(windows: ReturnType<typeof getRecapWindows>) {
  const [signups, views, exports, shares, generations, aiSearches] =
    await Promise.all([
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
      }, windows),
      compareWindows(({ start, end }) => {
        return prismaClient.studioGeneration.count({
          where: { createdAt: { gte: start, lt: end } }
        })
      }, windows),
      compareWindows(({ start, end }) => {
        return prismaClient.aiSearchLog.count({
          where: { createdAt: { gte: start, lt: end } }
        })
      }, windows)
    ])

  return { signups, views, exports, shares, generations, aiSearches }
}

async function fetchTopMemes({ start, end }: RecapWindow) {
  const rows = await prismaClient.memeViewDaily.groupBy({
    by: ['memeId'],
    where: { day: { gte: start, lt: end } },
    _count: { memeId: true },
    orderBy: { _count: { memeId: 'desc' } },
    take: TOP_MEMES_COUNT
  })

  const memes = await prismaClient.meme.findMany({
    where: {
      id: {
        in: rows.map((row) => {
          return row.memeId
        })
      }
    },
    select: { id: true, title: true }
  })

  return rows.flatMap((row) => {
    const meme = memes.find(({ id }) => {
      return id === row.memeId
    })

    return meme
      ? [
          {
            title: meme.title,
            url: `${SITE_URL}/memes/${meme.id}`,
            views: row._count.memeId
          }
        ]
      : []
  })
}

export async function buildWeeklyRecap(now: Date) {
  const windows = getRecapWindows(now)
  const stripeActivity = await fetchStripeActivity(windows.previous.start)

  const subscriptions = stripeActivity.subscriptions.map(toRecapSubscription)
  const emailByCustomerId = new Map(
    stripeActivity.subscriptions.map((subscription) => {
      return [
        getCustomerId(subscription.customer),
        getCustomerEmail(subscription.customer)
      ] as const
    })
  )

  const arrivals = findArrivals(subscriptions, windows.current)
  const departures = findDepartures(subscriptions, windows.current)

  const [usersByCustomerId, usage, topMemes] = await Promise.all([
    fetchUsersByCustomerId(
      [
        ...arrivals.map(({ subscription }) => {
          return subscription
        }),
        ...departures
      ].map(({ customerId }) => {
        return customerId
      })
    ),
    fetchUsage(windows),
    fetchTopMemes(windows.current)
  ])

  const firstStartByCustomerId = subscriptions
    .filter(matchHasBeenPaid)
    .reduce((firstStarts, sub) => {
      const known = firstStarts.get(sub.customerId)

      return known && known <= sub.startedAt
        ? firstStarts
        : firstStarts.set(sub.customerId, sub.startedAt)
    }, new Map<string, Date>())

  const toPerson = (subscription: RecapSubscription) => {
    const user = usersByCustomerId.get(subscription.customerId)

    return {
      email:
        user?.email ??
        emailByCustomerId.get(subscription.customerId) ??
        subscription.customerId,
      adminUrl: user ? `${SITE_URL}/admin/users/${user.id}` : null,
      providers: (user?.accounts ?? []).map(({ providerId }) => {
        return PROVIDER_LABELS.get(providerId) ?? providerId
      }),
      interval: subscription.interval,
      startedAt: subscription.startedAt,
      firstStartedAt:
        firstStartByCustomerId.get(subscription.customerId) ??
        subscription.startedAt
    }
  }

  const subscribersNow = summarizeSubscribersAt(
    subscriptions,
    windows.current.end
  )
  const subscribersBefore = summarizeSubscribersAt(
    subscriptions,
    windows.previous.end
  )
  const checkoutsNow = countCheckouts(stripeActivity.checkouts, windows.current)
  const checkoutsBefore = countCheckouts(
    stripeActivity.checkouts,
    windows.previous
  )

  return {
    window: windows.current,
    revenue: {
      mrrCents: {
        current: subscribersNow.mrrCents,
        previous: subscribersBefore.mrrCents
      },
      subscribers: {
        current: subscribersNow.monthly + subscribersNow.yearly,
        previous: subscribersBefore.monthly + subscribersBefore.yearly
      },
      monthly: subscribersNow.monthly,
      yearly: subscribersNow.yearly,
      collectedCents: {
        current: sumPaidCents(stripeActivity.invoices, windows.current),
        previous: sumPaidCents(stripeActivity.invoices, windows.previous)
      }
    },
    arrivals: arrivals.map(({ subscription, isComeback }) => {
      return { ...toPerson(subscription), isComeback }
    }),
    departures: departures.map((subscription) => {
      return {
        ...toPerson(subscription),
        endsAt: subscription.endedAt ?? subscription.cancelAt
      }
    }),
    funnel: {
      signups: usage.signups,
      checkoutsStarted: {
        current: checkoutsNow.started,
        previous: checkoutsBefore.started
      },
      checkoutsPaid: {
        current: checkoutsNow.paid,
        previous: checkoutsBefore.paid
      }
    },
    usage: {
      views: usage.views,
      exports: usage.exports,
      generations: usage.generations,
      shares: usage.shares,
      aiSearches: usage.aiSearches
    },
    topMemes
  }
}

export type WeeklyRecap = Awaited<ReturnType<typeof buildWeeklyRecap>>
