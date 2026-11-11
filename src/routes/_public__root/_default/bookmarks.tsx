import { createFileRoute, redirect } from '@tanstack/react-router'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { BookmarksPage } from './-components/bookmarks-page'

export const Route = createFileRoute('/_public__root/_default/bookmarks')({
  component: BookmarksPage,
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/memes' })
    }
  },
  loader: async ({ context }) => {
    void Promise.allSettled([
      context.queryClient.query({
        ...listBookmarkedMemesQueryOpts(),
        staleTime: 'static'
      })
    ])
  },
  head: () => {
    return {
      meta: [
        { title: m.settings_bookmarks_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
