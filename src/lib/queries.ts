import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { MemesFilters } from '~/constants/meme'
import { PRIVATE_QUERY_META } from '~/constants/query'
import {
  HOUR,
  MINUTE,
  FIVE_MINUTES_MS,
  TEN_MINUTES_MS,
  THIRTY_MINUTES_MS
} from '~/constants/time'
import type { Meme } from '~/db/generated/prisma/client'
import type { Locale } from '~/paraglide/runtime'
import { getAiSearchQuota } from '~/server/ai-search/ai-search.functions'
import { getAuthUser } from '~/server/auth/auth.functions'
import { listBookmarkedMemes } from '~/server/bookmark/bookmark.functions'
import { listCategories } from '~/server/category/category.functions'
import {
  countRecentMemes,
  listMemes,
  listRelatedMemes,
  listTrendingMemes
} from '~/server/meme/meme-list.functions'
import {
  getMeme,
  getMemeExportFile,
  getMemePlaybackUrl
} from '~/server/meme/meme.functions'
import { listReels } from '~/server/meme/reels.functions'
import { listUserProposals } from '~/server/proposal/proposal.functions'
import { getGenerationQuota } from '~/server/studio/studio.functions'
import { getActiveSubscription } from '~/server/subscription/subscription.functions'

export const listMemesQueryOpts = (filters: MemesFilters) => {
  return queryOptions({
    queryKey: [...listMemesQueryOpts.all, filters],
    queryFn: () => {
      return listMemes({ data: filters })
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listMemesQueryOpts.all = ['memes-list'] as const

export const getMemePlaybackUrlQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMemePlaybackUrlQueryOpts.all, memeId],
    queryFn: () => {
      return getMemePlaybackUrl({ data: memeId })
    },
    staleTime: HOUR,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

getMemePlaybackUrlQueryOpts.all = ['meme-playback-url'] as const

export const listTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...listTrendingMemesQueryOpts.all],
    queryFn: () => {
      return listTrendingMemes()
    },
    staleTime: THIRTY_MINUTES_MS
  })
}

listTrendingMemesQueryOpts.all = ['memes', 'trending'] as const

export const getMemeQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMemeQueryOpts.all, memeId],
    queryFn: () => {
      return getMeme({ data: memeId })
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getMemeQueryOpts.all = ['meme'] as const

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

export const listBookmarkedMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...listBookmarkedMemesQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listBookmarkedMemes()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listBookmarkedMemesQueryOpts.all = ['bookmarked-memes'] as const

export const listCategoriesQueryOpts = (locale: Locale) => {
  return queryOptions({
    queryKey: [...listCategoriesQueryOpts.all, locale],
    queryFn: () => {
      return listCategories({ data: { locale } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

listCategoriesQueryOpts.all = ['categories-list'] as const

export const countRecentMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...countRecentMemesQueryOpts.all],
    queryFn: () => {
      return countRecentMemes()
    },
    staleTime: TEN_MINUTES_MS
  })
}

countRecentMemesQueryOpts.all = ['recent-count-memes'] as const

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

export const listReelsQueryOpts = (excludedIds: string[] = []) => {
  return infiniteQueryOptions({
    queryKey: [...listReelsQueryOpts.all],
    queryFn: ({ pageParam }) => {
      return listReels({ data: { excludedIds: pageParam } })
    },
    initialPageParam: excludedIds,
    getNextPageParam: (lastPage) => {
      return lastPage.excludedIds
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listReelsQueryOpts.all = ['infinite-reels'] as const

type GetRelatedMemesQueryOptsParams = {
  memeId: Meme['id']
  title: string
}

export const listRelatedMemesQueryOpts = ({
  memeId,
  title
}: GetRelatedMemesQueryOptsParams) => {
  return queryOptions({
    queryKey: [...listRelatedMemesQueryOpts.all, memeId, title],
    queryFn: () => {
      return listRelatedMemes({ data: { memeId, title } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

listRelatedMemesQueryOpts.all = ['related-memes'] as const

export const listUserProposalsQueryOpts = () => {
  return queryOptions({
    queryKey: [...listUserProposalsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listUserProposals()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listUserProposalsQueryOpts.all = ['user-proposals'] as const

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

export const getAiSearchQuotaQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAiSearchQuotaQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAiSearchQuota()
    },
    staleTime: MINUTE
  })
}

getAiSearchQuotaQueryOpts.all = ['ai-search-quota'] as const

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
