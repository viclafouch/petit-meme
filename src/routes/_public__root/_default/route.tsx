import { createFileRoute } from '@tanstack/react-router'
import {
  getActiveSubscriptionQueryOpts,
  getCategoriesListQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { getLocale } from '~/paraglide/runtime'
import { DefaultLayout } from './-components/default-layout'

export const Route = createFileRoute('/_public__root/_default')({
  component: DefaultLayout,
  loader: ({ context }) => {
    const userQueries = context.user
      ? [
          context.queryClient.query({
            ...getFavoritesMemesQueryOpts(),
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
        ...getCategoriesListQueryOpts(getLocale()),
        staleTime: 'static'
      })
    ])
  }
})
