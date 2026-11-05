import { describe, expect, it } from 'vitest'
import { getPremiumStatus } from '~/routes/admin/-lib/premium'

const GRANTED_AT = new Date('2026-11-05T12:00:00Z')

describe('getPremiumStatus', () => {
  it('should classify an active subscription as paid', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: null,
        subscription: { status: 'active' }
      })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should classify a User both paying and granted as paid', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: GRANTED_AT,
        subscription: { status: 'active' }
      })
    ).toStrictEqual({ source: 'paid' })
  })

  it('should classify a grant after a past subscription as granted', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: GRANTED_AT,
        subscription: { status: 'past' }
      })
    ).toStrictEqual({ source: 'granted', grantedAt: GRANTED_AT })
  })

  it('should classify a User without grant nor subscription as none', () => {
    expect(
      getPremiumStatus({
        premiumGrantedAt: null,
        subscription: { status: 'none' }
      })
    ).toStrictEqual({ source: 'none' })
  })
})
