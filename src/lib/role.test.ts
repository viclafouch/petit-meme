import { describe, expect, it } from 'vitest'
import { matchIsPremium } from '~/lib/role'

const SUBSCRIPTION = { id: 'subscription-1' }

describe('matchIsPremium', () => {
  it('should count an admin as Premium without a subscription', () => {
    const user = { role: 'admin' }

    expect(matchIsPremium({ user, subscription: null })).toBe(true)
  })

  it('should count a User with an active subscription as Premium', () => {
    const user = { role: 'user' }

    expect(matchIsPremium({ user, subscription: SUBSCRIPTION })).toBe(true)
  })

  it('should not count a User without a subscription as Premium', () => {
    const user = { role: 'user' }

    expect(matchIsPremium({ user, subscription: null })).toBe(false)
  })

  it('should not count an anonymous Visitor as Premium', () => {
    expect(matchIsPremium({ user: null, subscription: SUBSCRIPTION })).toBe(
      false
    )
  })
})
