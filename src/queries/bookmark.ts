import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import {
  type BookmarksPageParam,
  listBookmarkIds,
  listBookmarks
} from '~/server/bookmark/bookmark.functions'

const BOOKMARK_QUERY_KEY = ['bookmark'] as const

const FIRST_BOOKMARKS_PAGE: BookmarksPageParam = { page: 1, after: null }

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
    initialPageParam: FIRST_BOOKMARKS_PAGE,
    getNextPageParam: (lastPage) => {
      return lastPage.next ?? undefined
    },
    staleTime: FIVE_MINUTES_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

listBookmarksQueryOpts.all = [...BOOKMARK_QUERY_KEY, 'pages'] as const
