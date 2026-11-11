import { describe, expect, it } from 'vitest'
import { buildCapState, buildReachedCapState, FREE_CAPS } from '~/helpers/cap'

const USES_FAR_PAST_THE_CAP = 10

describe('buildCapState', () => {
  it('should leave a Premium without cap', () => {
    expect(
      buildCapState({
        kind: 'aiSearch',
        usedCount: FREE_CAPS.aiSearch + USES_FAR_PAST_THE_CAP,
        isPremium: true
      })
    ).toStrictEqual({ isPremium: true, isReached: false, remaining: null })
  })

  it('should leave a free User the whole cap before any use', () => {
    expect(
      buildCapState({ kind: 'generation', usedCount: 0, isPremium: false })
    ).toStrictEqual({
      isPremium: false,
      isReached: false,
      remaining: FREE_CAPS.generation
    })
  })

  it('should reach the cap on its last use', () => {
    expect(
      buildCapState({
        kind: 'bookmark',
        usedCount: FREE_CAPS.bookmark,
        isPremium: false
      })
    ).toStrictEqual({ isPremium: false, isReached: true, remaining: 0 })
  })

  it('should never count below zero past the cap', () => {
    expect(
      buildCapState({
        kind: 'aiSearch',
        usedCount: FREE_CAPS.aiSearch + USES_FAR_PAST_THE_CAP,
        isPremium: false
      }).remaining
    ).toBe(0)
  })
})

describe('buildReachedCapState', () => {
  it('should describe a free User at the cap', () => {
    expect(buildReachedCapState('generation')).toStrictEqual({
      isPremium: false,
      isReached: true,
      remaining: 0
    })
  })
})
