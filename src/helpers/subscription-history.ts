import {
  type BillingInvoice,
  type BillingSubscription,
  countPaidMonths,
  getBillingPeriodFromInterval,
  getCustomerSince,
  getSubscriptionEnding,
  getSubscriptionState,
  matchHasBeenPaid,
  sumPaidCents
} from '~/helpers/subscription'

const sortByNewest = <Item>(items: Item[], getDate: (item: Item) => Date) => {
  return items.toSorted((first, second) => {
    return getDate(second).getTime() - getDate(first).getTime()
  })
}

type BuildSubscriptionHistoryParams = {
  subscriptions: BillingSubscription[]
  invoices: BillingInvoice[]
}

export function buildSubscriptionHistory({
  subscriptions,
  invoices
}: BuildSubscriptionHistoryParams) {
  const invoicesBySubscriptionId = Map.groupBy(
    sortByNewest(invoices, (invoice) => {
      return invoice.paidAt
    }),
    (invoice) => {
      return invoice.subscriptionId
    }
  )

  const paidSubscriptions = sortByNewest(
    subscriptions.filter(matchHasBeenPaid),
    (subscription) => {
      return subscription.startedAt
    }
  )

  return {
    customerSince: getCustomerSince(subscriptions),
    paidMonthCount: countPaidMonths(subscriptions, invoices),
    collectedCents: sumPaidCents(invoices),
    subscriptions: paidSubscriptions.map((subscription) => {
      return {
        ...subscription,
        state: getSubscriptionState(subscription),
        billingPeriod: getBillingPeriodFromInterval(subscription.interval),
        ending: getSubscriptionEnding(subscription),
        invoices: invoicesBySubscriptionId.get(subscription.id) ?? []
      }
    })
  }
}
