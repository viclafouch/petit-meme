import type { Stripe } from 'stripe'
import { SECOND } from '~/constants/time'
import type {
  BillingInvoice,
  BillingSubscription
} from '~/helpers/subscription'
import { getStripeClient } from '~/lib/stripe.server'

const STRIPE_CUSTOMER_LIST_MAX_ITEMS = 1000

export const fromUnixSeconds = (seconds: number) => {
  return new Date(seconds * SECOND)
}

const fromNullableUnixSeconds = (seconds: number | null) => {
  return seconds === null ? null : fromUnixSeconds(seconds)
}

export const toUnixSeconds = (date: Date) => {
  return Math.floor(date.getTime() / SECOND)
}

const getExpandableId = (field: string | { id: string }) => {
  return typeof field === 'string' ? field : field.id
}

export const toBillingSubscription = (
  subscription: Stripe.Subscription
): BillingSubscription => {
  const [item] = subscription.items.data

  return {
    id: subscription.id,
    customerId: getExpandableId(subscription.customer),
    status: subscription.status,
    interval: item?.price.recurring?.interval ?? 'month',
    amountCents: (item?.price.unit_amount ?? 0) * (item?.quantity ?? 1),
    startedAt: fromUnixSeconds(subscription.start_date),
    canceledAt: fromNullableUnixSeconds(subscription.canceled_at),
    cancelAt: fromNullableUnixSeconds(subscription.cancel_at),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    endedAt: fromNullableUnixSeconds(subscription.ended_at),
    periodEnd: item ? fromUnixSeconds(item.current_period_end) : null
  }
}

export const toBillingInvoice = (invoice: Stripe.Invoice): BillingInvoice => {
  const subscription = invoice.parent?.subscription_details?.subscription

  return {
    id: invoice.id,
    subscriptionId:
      subscription === undefined ? null : getExpandableId(subscription),
    paidAt: fromUnixSeconds(
      invoice.status_transitions.paid_at ?? invoice.created
    ),
    amountPaidCents: invoice.amount_paid,
    billingReason: invoice.billing_reason
  }
}

export async function fetchCustomerBilling(customerId: string) {
  const stripe = getStripeClient()
  const [subscriptions, invoices] = await Promise.all([
    stripe.subscriptions
      .list({ customer: customerId, status: 'all', limit: 100 })
      .autoPagingToArray({ limit: STRIPE_CUSTOMER_LIST_MAX_ITEMS }),
    stripe.invoices
      .list({ customer: customerId, status: 'paid', limit: 100 })
      .autoPagingToArray({ limit: STRIPE_CUSTOMER_LIST_MAX_ITEMS })
  ])

  return {
    subscriptions: subscriptions.map(toBillingSubscription),
    invoices: invoices.map(toBillingInvoice)
  }
}
