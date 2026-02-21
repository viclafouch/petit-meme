import type { MemesFilters } from '@/constants/meme'
import { NEWS_CATEGORY_SLUG, POPULAR_CATEGORY_SLUG } from '@/constants/meme'
import { MINUTE } from '@/constants/time'
import type { Meme, Video } from '@/db/generated/prisma/client'
import { getAdminMemeById, getAdminMemes } from '@/server/admin'
import { getCategories } from '@/server/categories'
import { getActiveSubscription } from '@/server/customer'
import {
  getMemeById,
  getMemes,
  getRecentCountMemes,
  getTrendingMemes,
  getVideoStatusById
} from '@/server/meme'
import { getInfiniteReels } from '@/server/reels'
import { getFavoritesMemes } from '@/server/user'
import { getAuthUser } from '@/server/user-auth'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'

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
    }
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

function getCategorySortPriority(slug: string) {
  if (slug === NEWS_CATEGORY_SLUG) {
    return 0
  }

  if (slug === POPULAR_CATEGORY_SLUG) {
    return 1
  }

  return 2
}

export const getCategoriesListQueryOpts = () => {
  return queryOptions({
    queryKey: [...getCategoriesListQueryOpts.all],
    queryFn: async () => {
      const categories = await getCategories()

      return categories.toSorted((categoryA, categoryB) => {
        return (
          getCategorySortPriority(categoryA.slug) -
          getCategorySortPriority(categoryB.slug)
        )
      })
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

export const getAdminMemeByIdQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeByIdQueryOpts.all, memeId],
    queryFn: () => {
      return getAdminMemeById({ data: memeId })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemeByIdQueryOpts.all = ['admin-meme'] as const

export const getAdminMemesListQueryOpts = (filters: MemesFilters) => {
  return queryOptions({
    queryKey: [...getAdminMemesListQueryOpts.all, filters],
    queryFn: () => {
      return getAdminMemes({ data: filters })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemesListQueryOpts.all = ['admin-memes-list'] as const

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
    }
  })
}

getInfiniteReelsQueryOpts.all = ['infinite-reels'] as const
