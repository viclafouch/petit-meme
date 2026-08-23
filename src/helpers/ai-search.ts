import { FREE_PLAN_MAX_AI_SEARCHES } from '~/constants/ai-search'

type BuildAiSearchQuotaParams = {
  monthlyCount: number
  isPremium: boolean
}

export function buildAiSearchQuota({
  monthlyCount,
  isPremium
}: BuildAiSearchQuotaParams) {
  return {
    canSearch: isPremium || monthlyCount < FREE_PLAN_MAX_AI_SEARCHES,
    remainingSearches: isPremium
      ? null
      : Math.max(0, FREE_PLAN_MAX_AI_SEARCHES - monthlyCount),
    isPremium
  }
}
