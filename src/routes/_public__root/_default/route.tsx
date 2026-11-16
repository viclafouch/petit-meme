import { createFileRoute } from '@tanstack/react-router'
import { prefetchPublicPageQueries } from '~/routes/_public__root/-lib/prefetch-public-page-queries'
import { DefaultLayout } from './-components/default-layout'

export const Route = createFileRoute('/_public__root/_default')({
  component: DefaultLayout,
  loader: ({ context }) => {
    prefetchPublicPageQueries({
      queryClient: context.queryClient,
      isSignedIn: Boolean(context.user)
    })
  }
})
