import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { MemesFilters } from '~/constants/meme'
import { MINUTE } from '~/constants/time'
import type { Meme, Video } from '~/db/generated/prisma/client'
import type { Locale } from '~/paraglide/runtime'
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
    staleTime: 5 * MINUTE
  })
}

getMemesListQueryOpts.all = ['memes-list'] as const

export const getTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getTrendingMemesQueryOpts.all],
    queryFn: () => {
      return getTrendingMemes()
    },
    staleTime: 30 * MINUTE
  })
}

getTrendingMemesQueryOpts.all = ['memes', 'trending'] as const

export const getMemeByIdQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMemeByIdQueryOpts.all, memeId],
    queryFn: () => {
      return getMemeById({ data: memeId })
    },
    staleTime: 5 * MINUTE
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
    queryFn: () => {
      return getAuthUser()
    },
    staleTime: 5 * MINUTE
  })
}

getAuthUserQueryOpts.all = ['auth-user'] as const

export const getFavoritesMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getFavoritesMemesQueryOpts.all],
    queryFn: () => {
      return getFavoritesMemes()
    },
    staleTime: 5 * MINUTE
  })
}

getFavoritesMemesQueryOpts.all = ['favorites-memes'] as const

export const getCategoriesListQueryOpts = (locale: Locale) => {
  return queryOptions({
    queryKey: [...getCategoriesListQueryOpts.all, locale],
    queryFn: () => {
      return getCategories({ data: { locale } })
    },
    staleTime: 10 * MINUTE
  })
}

getCategoriesListQueryOpts.all = ['categories-list'] as const

export const getRecentCountMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getRecentCountMemesQueryOpts.all],
    queryFn: () => {
      return getRecentCountMemes()
    },
    staleTime: 10 * MINUTE
  })
}

getRecentCountMemesQueryOpts.all = ['recent-count-memes'] as const

export const getActiveSubscriptionQueryOpts = () => {
  return queryOptions({
    queryKey: [...getActiveSubscriptionQueryOpts.all],
    queryFn: () => {
      return getActiveSubscription()
    },
    staleTime: 5 * MINUTE
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
    staleTime: 5 * MINUTE
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
    staleTime: 10 * MINUTE
  })
}

getRelatedMemesQueryOpts.all = ['related-memes'] as const

export const getUserSubmissionsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getUserSubmissionsQueryOpts.all],
    queryFn: () => {
      return getUserSubmissions()
    },
    staleTime: 5 * MINUTE
  })
}

getUserSubmissionsQueryOpts.all = ['user-submissions'] as const

export const getVideoBlobQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getVideoBlobQueryOpts.all, memeId],
    queryFn: async () => {
      const response = await shareMeme({ data: memeId })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getVideoBlobQueryOpts.all = ['video-blob'] as const
