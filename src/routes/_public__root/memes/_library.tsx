import { createFileRoute } from '@tanstack/react-router'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import {
  countLibraryMemesQueryOpts,
  listCategoriesQueryOpts
} from '~/queries/category'
import { prefetchPublicPageQueries } from '~/routes/_public__root/-lib/prefetch-public-page-queries'
import { LibraryLayout } from './_library/-components/library-layout'
import memesLibraryCss from './_library/-components/memes-library.css?url'

export const Route = createFileRoute('/_public__root/memes/_library')({
  loader: async ({ context }) => {
    prefetchPublicPageQueries({
      queryClient: context.queryClient,
      isSignedIn: Boolean(context.user)
    })

    await Promise.all([
      context.queryClient.query({
        ...listCategoriesQueryOpts(getLocale()),
        staleTime: 'static'
      }),
      context.queryClient.query(countLibraryMemesQueryOpts(getLocale())),
      context.user
        ? context.queryClient.query({
            ...listBookmarkIdsQueryOpts(),
            staleTime: 'static'
          })
        : null
    ])
  },
  head: () => {
    return {
      links: [{ rel: 'stylesheet', href: memesLibraryCss }]
    }
  },
  component: LibraryLayout
})
