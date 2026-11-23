import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import {
  listBookmarkIds,
  listBookmarks
} from '~/server/bookmark/bookmark.functions'

const BOOKMARK_QUERY_KEY = ['bookmark'] as const

export const listBookmarkIdsQueryOpts = () => {
  return queryOptions({
    queryKey: [...listBookmarkIdsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listBookmarkIds()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listBookmarkIdsQueryOpts.all = [...BOOKMARK_QUERY_KEY, 'ids'] as const

export const countBookmarksQueryOpts = () => {
  return queryOptions({
    ...listBookmarkIdsQueryOpts(),
    select: (memeIds) => {
      return memeIds.length
    }
  })
}

export const listBookmarksQueryOpts = () => {
  return infiniteQueryOptions({
    queryKey: [...listBookmarksQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: ({ pageParam }) => {
      return listBookmarks({ data: pageParam })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listBookmarksQueryOpts.all = [...BOOKMARK_QUERY_KEY, 'pages'] as const
