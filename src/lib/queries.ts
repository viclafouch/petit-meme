import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { MemesFilters } from '~/constants/meme'
import { PRIVATE_QUERY_META } from '~/constants/query'
import {
  MINUTE,
  FIVE_MINUTES_MS,
  TEN_MINUTES_MS,
  THIRTY_MINUTES_MS
} from '~/constants/time'
import type { Meme, Video } from '~/db/generated/prisma/client'
import type { Locale } from '~/paraglide/runtime'
import { checkAiSearchQuota } from '~/server/ai-search'
import { getCategories } from '~/server/categories'
import { getActiveSubscription } from '~/server/customer'
import {
  getMemeById,
  getMemes,
  getRecentCountMemes,
  getRelatedMemes,
  getTrendingMemes,
  getVideoStatusById,
  shareMeme
} from '~/server/meme'
import { getUserSubmissions } from '~/server/meme-submission'
import { getInfiniteReels } from '~/server/reels'
import { getFavoritesMemes } from '~/server/user'
import { getAuthUser } from '~/server/user-auth'

export const getMemesListQueryOpts = (filters: MemesFilters) => {
  return queryOptions({
    queryKey: [...getMemesListQueryOpts.all, filters],
    queryFn: () => {
      return getMemes({ data: filters })
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getMemesListQueryOpts.all = ['memes-list'] as const

export const getTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getTrendingMemesQueryOpts.all],
    queryFn: () => {
      return getTrendingMemes()
    },
    staleTime: THIRTY_MINUTES_MS
  })
}

getTrendingMemesQueryOpts.all = ['memes', 'trending'] as const

export const getMemeByIdQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMemeByIdQueryOpts.all, memeId],
    queryFn: () => {
      return getMemeById({ data: memeId })
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getMemeByIdQueryOpts.all = ['meme'] as const

export const getVideoStatusByIdQueryOpts = (videoId: Video['id']) => {
  return queryOptions({
    queryKey: [...getVideoStatusByIdQueryOpts.all, videoId],
    queryFn: () => {
      return getVideoStatusById({ data: videoId })
    },
    staleTime: MINUTE
  })
}

getVideoStatusByIdQueryOpts.all = ['video-status'] as const

export const getAuthUserQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAuthUserQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAuthUser()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getAuthUserQueryOpts.all = ['auth-user'] as const

export const getFavoritesMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getFavoritesMemesQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getFavoritesMemes()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getFavoritesMemesQueryOpts.all = ['favorites-memes'] as const

export const getCategoriesListQueryOpts = (locale: Locale) => {
  return queryOptions({
    queryKey: [...getCategoriesListQueryOpts.all, locale],
    queryFn: () => {
      return getCategories({ data: { locale } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

getCategoriesListQueryOpts.all = ['categories-list'] as const

export const getRecentCountMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getRecentCountMemesQueryOpts.all],
    queryFn: () => {
      return getRecentCountMemes()
    },
    staleTime: TEN_MINUTES_MS
  })
}

getRecentCountMemesQueryOpts.all = ['recent-count-memes'] as const

export const getActiveSubscriptionQueryOpts = () => {
  return queryOptions({
    queryKey: [...getActiveSubscriptionQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getActiveSubscription()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getActiveSubscriptionQueryOpts.all = ['active-subscription'] as const

export const getInfiniteReelsQueryOpts = (excludedIds: string[] = []) => {
  return infiniteQueryOptions({
    queryKey: [...getInfiniteReelsQueryOpts.all],
    queryFn: ({ pageParam }) => {
      return getInfiniteReels({ data: { excludedIds: pageParam } })
    },
    initialPageParam: excludedIds,
    getNextPageParam: (lastPage) => {
      return lastPage.excludedIds
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getInfiniteReelsQueryOpts.all = ['infinite-reels'] as const

type GetRelatedMemesQueryOptsParams = {
  memeId: Meme['id']
  title: string
}

export const getRelatedMemesQueryOpts = ({
  memeId,
  title
}: GetRelatedMemesQueryOptsParams) => {
  return queryOptions({
    queryKey: [...getRelatedMemesQueryOpts.all, memeId, title],
    queryFn: () => {
      return getRelatedMemes({ data: { memeId, title } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

getRelatedMemesQueryOpts.all = ['related-memes'] as const

export const getUserSubmissionsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getUserSubmissionsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getUserSubmissions()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getUserSubmissionsQueryOpts.all = ['user-submissions'] as const

export const getVideoBlobQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getVideoBlobQueryOpts.all, memeId],
    queryFn: async () => {
      const response = await shareMeme({
        data: { memeId, mode: 'studio' }
      })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getVideoBlobQueryOpts.all = ['video-blob'] as const

export const getAiSearchQuotaQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAiSearchQuotaQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return checkAiSearchQuota()
    },
    staleTime: MINUTE
  })
}

getAiSearchQuotaQueryOpts.all = ['ai-search-quota'] as const
