import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import {
  listBookmarkIdsQueryOpts,
  listBookmarksQueryOpts
} from '~/queries/bookmark'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { BookmarksPage } from './-components/bookmarks-page'

export const Route = createFileRoute('/_public__root/memes/_library/bookmarks')(
  {
    loader: async ({ context }) => {
      const trendingMemes = Promise.allSettled([
        context.queryClient.query({
          ...listTrendingMemesQueryOpts(),
          staleTime: 'static'
        })
      ])

      if (!context.user) {
        await trendingMemes

        return
      }

      const [bookmarksPages] = await Promise.all([
        context.queryClient.infiniteQuery({
          ...listBookmarksQueryOpts(),
          staleTime: 'static'
        }),
        context.queryClient.query({
          ...listBookmarkIdsQueryOpts(),
          staleTime: 'static'
        })
      ])
      const total = bookmarksPages.pages[0]?.total ?? 0

      if (total === 0) {
        await trendingMemes
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
