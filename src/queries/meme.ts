import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { MemesFilters } from '~/constants/meme'
import {
  FIVE_MINUTES_MS,
  HOUR,
  TEN_MINUTES_MS,
  THIRTY_MINUTES_MS
} from '~/constants/time'
import type { Meme } from '~/db/generated/prisma/client'
import {
  countRecentMemes,
  listMemes,
  listRelatedMemes,
  listTrendingMemes
} from '~/server/meme/meme-list.functions'
import { getMeme, getMemePlaybackUrl } from '~/server/meme/meme.functions'
import { listReels } from '~/server/meme/reels.functions'

type GetRelatedMemesQueryOptsParams = {
  memeId: Meme['id']
  title: string
}

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
