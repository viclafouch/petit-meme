import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { listBookmarkedMemes } from '~/server/bookmark/bookmark.functions'

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
