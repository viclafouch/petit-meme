import { createFileRoute, redirect } from '@tanstack/react-router'
import { getFavoritesMemesQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'
import { FavoritesPage } from './-components/favorites-page'

export const Route = createFileRoute('/_public__root/_default/favorites')({
  component: FavoritesPage,
  head: () => {
    return {
      meta: [
        { title: m.settings_favorites_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  },
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/memes' })
    }
  },
  loader: async ({ context }) => {
    void Promise.allSettled([
      context.queryClient.query({
        ...getFavoritesMemesQueryOpts(),
        staleTime: 'static'
      })
    ])
  }
})
