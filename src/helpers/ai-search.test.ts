import { describe, expect, it } from 'vitest'
import { FREE_PLAN_MAX_AI_SEARCHES } from '~/constants/ai-search'
import { buildAiSearchQuota } from '~/helpers/ai-search'

describe('buildAiSearchQuota', () => {
  it('should count no search against a Premium', () => {
    const monthlyCount = FREE_PLAN_MAX_AI_SEARCHES + 10

    const quota = buildAiSearchQuota({ monthlyCount, isPremium: true })

    expect(quota).toStrictEqual({
      canSearch: true,
      remainingSearches: null,
      isPremium: true
    })
  })

  it('should leave a free User their whole allowance before any search', () => {
    const monthlyCount = 0

    const quota = buildAiSearchQuota({ monthlyCount, isPremium: false })

    expect(quota).toStrictEqual({
      canSearch: true,
      remainingSearches: FREE_PLAN_MAX_AI_SEARCHES,
      isPremium: false
    })
  })

  it('should refuse a free User whose allowance is spent', () => {
    const monthlyCount = FREE_PLAN_MAX_AI_SEARCHES

    const quota = buildAiSearchQuota({ monthlyCount, isPremium: false })

    expect(quota).toStrictEqual({
      canSearch: false,
      remainingSearches: 0,
      isPremium: false
    })
  })

  it('should never announce a negative count to a User past the free cap', () => {
    const monthlyCount = FREE_PLAN_MAX_AI_SEARCHES + 7

    const quota = buildAiSearchQuota({ monthlyCount, isPremium: false })

    expect(quota.remainingSearches).toBe(0)
  })
})
