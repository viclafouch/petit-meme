import { describe, expect, it } from 'vitest'
import { buildSubscriptionInfo, getPremiumStatus } from '~/helpers/premium'

const GRANTED_AT = new Date('2026-11-05T12:00:00Z')

describe('getPremiumStatus', () => {
  it('should classify an admin as Premium through the role', () => {
    expect(
      getPremiumStatus({
        role: 'admin',
        premiumGrantedAt: null,
        subscription: { isPremium: false }
      })
    ).toStrictEqual({ source: 'admin' })
  })

  it('should classify an active subscription as paid', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: null,
        subscription: { isPremium: true }
      })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should classify a User both paying and granted as paid', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: GRANTED_AT,
        subscription: { isPremium: true }
      })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should classify a grant after a past subscription as granted', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: GRANTED_AT,
        subscription: { isPremium: false }
      })
    ).toStrictEqual({ source: 'granted', grantedAt: GRANTED_AT })
  })

  it('should classify a User without grant nor subscription as none', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: null,
        subscription: { isPremium: false }
      })
    ).toStrictEqual({ source: 'none' })
  })
})

const PERIOD_END = new Date('2026-12-01T00:00:00.000Z')

const buildRow = (
  overrides: Partial<Parameters<typeof buildSubscriptionInfo>[0][number]>
) => {
  return {
    status: 'active',
    billingInterval: 'month',
    periodEnd: PERIOD_END,
    cancelAt: null,
    cancelAtPeriodEnd: false,
    endedAt: null,
    ...overrides
  }
}

describe('buildSubscriptionInfo', () => {
  it('should keep a cancelled subscriber Premium until the end of the paid period', () => {
    const info = buildSubscriptionInfo([buildRow({ cancelAt: PERIOD_END })])

    expect(info).toStrictEqual({
      state: 'ending',
      isPremium: true,
      billingPeriod: 'monthly',
      ending: { kind: 'ends', date: PERIOD_END }
    })
    expect(
      getPremiumStatus({ premiumGrantedAt: null, subscription: info })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should keep a subscriber Premium while Stripe retries the payment', () => {
    const info = buildSubscriptionInfo([buildRow({ status: 'past_due' })])

    expect(info.state).toBe('failing')
    expect(
      getPremiumStatus({ premiumGrantedAt: null, subscription: info })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should close Premium once Stripe stops retrying the payment', () => {
    const info = buildSubscriptionInfo([buildRow({ status: 'unpaid' })])

    expect(info.state).toBe('failing')
    expect(
      getPremiumStatus({ premiumGrantedAt: null, subscription: info })
    ).toStrictEqual({ source: 'none' })
  })

  it('should show a failed payment rather than a former subscriber', () => {
    const info = buildSubscriptionInfo([
      buildRow({
        status: 'canceled',
        endedAt: new Date('2026-04-10T00:00:00.000Z')
      }),
      buildRow({ status: 'past_due' })
    ])

    expect(info.state).toBe('failing')
  })

  it('should keep the latest end of a former subscriber', () => {
    const info = buildSubscriptionInfo([
      buildRow({
        status: 'canceled',
        endedAt: new Date('2026-04-10T00:00:00.000Z')
      }),
      buildRow({
        status: 'canceled',
        endedAt: new Date('2026-10-10T00:00:00.000Z')
      })
    ])

    expect(info).toStrictEqual({
      state: 'ended',
      isPremium: false,
      billingPeriod: 'monthly',
      ending: { kind: 'ends', date: new Date('2026-10-10T00:00:00.000Z') }
    })
  })

  it('should ignore a checkout that was never paid', () => {
    const info = buildSubscriptionInfo([buildRow({ status: 'incomplete' })])

    expect(info).toStrictEqual({
      state: null,
      isPremium: false,
      billingPeriod: null,
      ending: null
    })
  })
})
