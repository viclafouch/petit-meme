import { describe, expect, it } from 'vitest'
import type {
  BillingInvoice,
  BillingSubscription
} from '~/helpers/subscription'
import { buildSubscriptionHistory } from '~/helpers/subscription-history'

const MONTHLY_PRICE_CENTS = 399
const YEARLY_PRICE_CENTS = 2999

const FIRST_SUBSCRIPTION: BillingSubscription = {
  id: 'sub_first',
  customerId: 'cus_a',
  status: 'canceled',
  interval: 'month',
  amountCents: MONTHLY_PRICE_CENTS,
  startedAt: new Date('2026-01-10T00:00:00.000Z'),
  canceledAt: new Date('2026-03-20T00:00:00.000Z'),
  cancelAt: null,
  cancelAtPeriodEnd: true,
  endedAt: new Date('2026-04-10T00:00:00.000Z'),
  periodEnd: new Date('2026-04-10T00:00:00.000Z')
}

const RETURN_SUBSCRIPTION: BillingSubscription = {
  id: 'sub_return',
  customerId: 'cus_a',
  status: 'active',
  interval: 'year',
  amountCents: YEARLY_PRICE_CENTS,
  startedAt: new Date('2026-09-01T00:00:00.000Z'),
  canceledAt: null,
  cancelAt: null,
  cancelAtPeriodEnd: false,
  endedAt: null,
  periodEnd: new Date('2027-09-01T00:00:00.000Z')
}

const buildInvoice = (overrides: Partial<BillingInvoice>): BillingInvoice => {
  return {
    id: 'in_a',
    subscriptionId: 'sub_first',
    paidAt: new Date('2026-01-10T00:00:00.000Z'),
    amountPaidCents: MONTHLY_PRICE_CENTS,
    billingReason: 'subscription_cycle',
    ...overrides
  }
}

const INVOICES = [
  buildInvoice({ id: 'in_create', billingReason: 'subscription_create' }),
  buildInvoice({
    id: 'in_return',
    subscriptionId: 'sub_return',
    paidAt: new Date('2026-09-01T00:00:00.000Z'),
    amountPaidCents: YEARLY_PRICE_CENTS,
    billingReason: 'subscription_create'
  }),
  buildInvoice({
    id: 'in_cycle',
    paidAt: new Date('2026-02-10T00:00:00.000Z')
  })
]

describe('buildSubscriptionHistory', () => {
  it('should show each subscription of a User who left and came back, newest first', () => {
    const history = buildSubscriptionHistory({
      subscriptions: [FIRST_SUBSCRIPTION, RETURN_SUBSCRIPTION],
      invoices: INVOICES
    })

    expect(
      history.subscriptions.map(({ id, startedAt, ending, invoices }) => {
        return {
          id,
          startedAt,
          ending,
          invoiceIds: invoices.map((invoice) => {
            return invoice.id
          })
        }
      })
    ).toStrictEqual([
      {
        id: 'sub_return',
        startedAt: new Date('2026-09-01T00:00:00.000Z'),
        ending: {
          kind: 'renews',
          date: new Date('2027-09-01T00:00:00.000Z')
        },
        invoiceIds: ['in_return']
      },
      {
        id: 'sub_first',
        startedAt: new Date('2026-01-10T00:00:00.000Z'),
        ending: { kind: 'ends', date: new Date('2026-04-10T00:00:00.000Z') },
        invoiceIds: ['in_cycle', 'in_create']
      }
    ])
  })

  it('should sum the paid months and the collected amount over every subscription', () => {
    const history = buildSubscriptionHistory({
      subscriptions: [FIRST_SUBSCRIPTION, RETURN_SUBSCRIPTION],
      invoices: INVOICES
    })

    expect({
      customerSince: history.customerSince,
      paidMonthCount: history.paidMonthCount,
      collectedCents: history.collectedCents
    }).toStrictEqual({
      customerSince: new Date('2026-01-10T00:00:00.000Z'),
      paidMonthCount: 14,
      collectedCents:
        MONTHLY_PRICE_CENTS + YEARLY_PRICE_CENTS + MONTHLY_PRICE_CENTS
    })
  })

  it('should leave out a subscription whose first payment never went through', () => {
    const history = buildSubscriptionHistory({
      subscriptions: [
        {
          ...FIRST_SUBSCRIPTION,
          id: 'sub_expired',
          status: 'incomplete_expired',
          startedAt: new Date('2025-06-01T00:00:00.000Z')
        },
        RETURN_SUBSCRIPTION
      ],
      invoices: []
    })

    expect(
      history.subscriptions.map(({ id }) => {
        return id
      })
    ).toStrictEqual(['sub_return'])
    expect(history.customerSince).toStrictEqual(
      new Date('2026-09-01T00:00:00.000Z')
    )
  })
})
