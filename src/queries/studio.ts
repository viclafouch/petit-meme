import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { Meme } from '~/db/generated/prisma/client'
import { getMemeExportFile } from '~/server/meme/meme.functions'
import { getGenerationQuota } from '~/server/studio/studio.functions'

export const getStudioVideoQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getStudioVideoQueryOpts.all, memeId],
    queryFn: async () => {
      const response = await getMemeExportFile({
        data: { memeId, mode: 'studio', format: 'mp4' }
      })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getStudioVideoQueryOpts.all = ['video-blob'] as const

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
