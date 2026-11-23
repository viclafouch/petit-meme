import type { QueryClient } from '@tanstack/react-query'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import { listCategoriesQueryOpts } from '~/queries/category'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

type PrefetchPublicPageQueriesParams = {
  queryClient: QueryClient
  isSignedIn: boolean
}

export const prefetchPublicPageQueries = ({
  queryClient,
  isSignedIn
}: PrefetchPublicPageQueriesParams) => {
  const userQueries = isSignedIn
    ? [
        queryClient.query({
          ...listBookmarkIdsQueryOpts(),
          staleTime: 'static'
        }),
        queryClient.query({
          ...getPremiumSubscriptionQueryOpts(),
          staleTime: 'static'
        })
      ]
    : []

  void Promise.allSettled([
    ...userQueries,
    queryClient.query({
      ...listCategoriesQueryOpts(getLocale()),
      staleTime: 'static'
    })
  ])
}
