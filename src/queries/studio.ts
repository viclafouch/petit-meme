import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import type { StudioPlan } from '~/constants/studio'
import { MINUTE } from '~/constants/time'
import { fetchStudioSource } from '~/lib/studio/studio-source'
import { getGenerationQuota } from '~/server/studio/studio.functions'

export const getGenerationQuotaQueryOpts = () => {
  return queryOptions({
    queryKey: [...getGenerationQuotaQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getGenerationQuota()
    },
    staleTime: MINUTE
  })
}

getGenerationQuotaQueryOpts.all = ['generation-quota'] as const

export const getStudioSourceQueryOpts = (memeId: string, plan: StudioPlan) => {
  return queryOptions({
    queryKey: [...getStudioSourceQueryOpts.all, memeId, plan],
    queryFn: () => {
      return fetchStudioSource({ memeId, plan })
    },
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false
  })
}

getStudioSourceQueryOpts.all = ['studio-source'] as const
