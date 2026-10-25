import { describe, expect, it } from 'vitest'
import type { Subscription } from '@better-auth/stripe'
import { getBillingPeriodFromInterval } from '~/helpers/subscription'

describe('getBillingPeriodFromInterval', () => {
  it('should bill a yearly Stripe interval by the year', () => {
    const billingPeriod = getBillingPeriodFromInterval('year')

    expect(billingPeriod).toBe('yearly')
  })

  it('should bill a monthly Stripe interval by the month', () => {
    const billingPeriod = getBillingPeriodFromInterval('month')

    expect(billingPeriod).toBe('monthly')
  })

  it('should bill a weekly Stripe interval by the month', () => {
    const billingPeriod = getBillingPeriodFromInterval('week')

    expect(billingPeriod).toBe('monthly')
  })

  it('should bill a subscription without an interval by the month', () => {
    const incompleteSubscription: Pick<Subscription, 'billingInterval'> = {}

    const billingPeriod = getBillingPeriodFromInterval(
      incompleteSubscription.billingInterval
    )

    expect(billingPeriod).toBe('monthly')
  })
})
