import { queryOptions, type QueryClient } from '@tanstack/react-query'
import type { AdminMemesFilters } from '~/constants/meme'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { Meme, Video } from '~/db/generated/prisma/client'
import { getAdminDashboardTotalsQueryOpts } from '~/queries/admin/dashboard'
import { getMemeQueryOpts } from '~/queries/meme'
import {
  getAdminMemeOriginal,
  getMissingMemeFiles
} from '~/server/admin/meme/meme-file.functions'
import {
  getAdminMeme,
  getAdminVideoStatus,
  listAdminMemes
} from '~/server/admin/meme/meme.functions'

const BACKGROUND_STALE_MINUTES = 5

export const getAdminMemeQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminMeme({ data: memeId })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemeQueryOpts.all = ['admin-meme'] as const

export const getAdminVideoStatusQueryOpts = (videoId: Video['id']) => {
  return queryOptions({
    queryKey: [...getAdminVideoStatusQueryOpts.all, videoId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminVideoStatus({ data: videoId })
    },
    staleTime: MINUTE
  })
}

getAdminVideoStatusQueryOpts.all = ['admin-video-status'] as const

export const listAdminMemesQueryOpts = (filters: AdminMemesFilters) => {
  return queryOptions({
    queryKey: [...listAdminMemesQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminMemes({ data: filters })
    },
    staleTime: 2 * MINUTE
  })
}

listAdminMemesQueryOpts.all = ['admin-memes-list'] as const

export const getMissingMemeFilesQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMissingMemeFilesQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getMissingMemeFiles({ data: memeId })
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getMissingMemeFilesQueryOpts.all = ['admin-meme-files'] as const

export const getAdminMemeOriginalQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeOriginalQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: async () => {
      const response = await getAdminMemeOriginal({ data: memeId })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getAdminMemeOriginalQueryOpts.all = ['admin-video-blob'] as const

export const invalidateSavedMeme = (
  queryClient: QueryClient,
  memeId: Meme['id']
) => {
  queryClient.removeQueries(getMemeQueryOpts(memeId))

  return queryClient.invalidateQueries(getAdminMemeQueryOpts(memeId))
}

export const markAdminMemesOverviewStale = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: listAdminMemesQueryOpts.all,
      refetchType: 'none'
    }),
    queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all,
      refetchType: 'none'
    })
  ])
}

export const invalidateAdminMemesOverview = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: listAdminMemesQueryOpts.all
    }),
    queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all
    })
  ])
}
