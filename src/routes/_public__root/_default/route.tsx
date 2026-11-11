import { createFileRoute } from '@tanstack/react-router'
import {
  getActiveSubscriptionQueryOpts,
  listCategoriesQueryOpts,
  listBookmarkedMemesQueryOpts
} from '~/lib/queries'
import { getLocale } from '~/paraglide/runtime'
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
