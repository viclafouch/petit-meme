import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import { listBookmarksQueryOpts } from '~/queries/bookmark'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { BookmarksPage } from './-components/bookmarks-page'

export const Route = createFileRoute('/_public__root/memes/_library/bookmarks')(
  {
    loader: async ({ context, preload }) => {
      if (!context.user) {
        return
      }

      const bookmarksPages = await context.queryClient.infiniteQuery(
        preload
          ? { ...listBookmarksQueryOpts(), staleTime: 'static' }
          : listBookmarksQueryOpts()
      )

      if (bookmarksPages.pages[0]?.total === 0) {
        await Promise.allSettled([
          context.queryClient.query({
            ...listTrendingMemesQueryOpts(),
            staleTime: 'static'
          })
        ])
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
