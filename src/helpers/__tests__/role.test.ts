import { describe, expect, it } from 'vitest'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { matchCanViewMeme, matchIsPremium } from '~/helpers/role'

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

  it('should count a User with a granted Premium as Premium', () => {
    const user = { role: 'user', premiumGrantedAt: new Date() }

    expect(matchIsPremium({ user, subscription: null })).toBe(true)
  })

  it('should not count a User with a revoked grant as Premium', () => {
    const user = { role: 'user', premiumGrantedAt: null }

    expect(matchIsPremium({ user, subscription: null })).toBe(false)
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

describe('matchCanViewMeme', () => {
  const admin = { role: 'admin' }
  const user = { role: 'user' }

  it('should show a published Meme to everyone', () => {
    expect(matchCanViewMeme({ user: null, status: MemeStatus.PUBLISHED })).toBe(
      true
    )
    expect(matchCanViewMeme({ user, status: MemeStatus.PUBLISHED })).toBe(true)
  })

  it('should show a pending Meme to an admin only', () => {
    expect(matchCanViewMeme({ user: admin, status: MemeStatus.PENDING })).toBe(
      true
    )
    expect(matchCanViewMeme({ user, status: MemeStatus.PENDING })).toBe(false)
    expect(matchCanViewMeme({ user: null, status: MemeStatus.PENDING })).toBe(
      false
    )
  })

  it('should hide an archived or rejected Meme from an admin', () => {
    expect(matchCanViewMeme({ user: admin, status: MemeStatus.ARCHIVED })).toBe(
      false
    )
    expect(matchCanViewMeme({ user: admin, status: MemeStatus.REJECTED })).toBe(
      false
    )
  })
})
