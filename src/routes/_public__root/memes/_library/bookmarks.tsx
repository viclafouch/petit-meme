import type { QueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import { listBookmarksQueryOpts } from '~/queries/bookmark'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { BookmarksPage } from './-components/bookmarks-page'

const settleTrendingMemes = (queryClient: QueryClient) => {
  return Promise.allSettled([
    queryClient.query({ ...listTrendingMemesQueryOpts(), staleTime: 'static' })
  ])
}

export const Route = createFileRoute('/_public__root/memes/_library/bookmarks')(
  {
    loader: async ({ context }) => {
      if (!context.user) {
        await settleTrendingMemes(context.queryClient)

        return
      }

      const bookmarksPages = await context.queryClient.infiniteQuery({
        ...listBookmarksQueryOpts(),
        staleTime: 'static'
      })

      if (bookmarksPages.pages[0]?.total === 0) {
        await settleTrendingMemes(context.queryClient)
      }
    },
    head: () => {
      return buildSeo({
        title: m.bookmark_seo_title(),
        description: m.bookmark_intro_description(),
        pathname: '/memes/bookmarks',
        noindex: true
      })
    },
    component: BookmarksPage
  }
)
