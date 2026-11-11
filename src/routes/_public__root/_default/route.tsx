import { createFileRoute } from '@tanstack/react-router'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { listCategoriesQueryOpts } from '~/queries/category'
import { getActiveSubscriptionQueryOpts } from '~/queries/subscription'
import { DefaultLayout } from './-components/default-layout'

export const Route = createFileRoute('/_public__root/_default')({
  component: DefaultLayout,
  loader: ({ context }) => {
    const userQueries = context.user
      ? [
          context.queryClient.query({
            ...listBookmarkedMemesQueryOpts(),
            staleTime: 'static'
          }),
          context.queryClient.query({
            ...getActiveSubscriptionQueryOpts(),
            staleTime: 'static'
          })
        ]
      : []

    void Promise.allSettled([
      ...userQueries,
      context.queryClient.query({
        ...listCategoriesQueryOpts(getLocale()),
        staleTime: 'static'
      })
    ])
  }
})
