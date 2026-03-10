import { MemesList } from '@/components/Meme/memes-list'
import { getFavoritesMemesQueryOpts } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import {
  PageDescription,
  PageHeading
} from '@/routes/_public__root/-components/page-headers'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

const RouteComponent = () => {
  const favoritesMemeQuery = useSuspenseQuery(getFavoritesMemesQueryOpts())

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>{m.settings_favorites_heading()}</PageHeading>
        <PageDescription>{m.settings_favorites_description()}</PageDescription>
      </div>
      <div className="w-full mx-auto">
        <MemesList
          layoutContext="favorites"
          memes={favoritesMemeQuery.data.bookmarks}
        />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/favorites')({
  component: RouteComponent,
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
    void context.queryClient.ensureQueryData(getFavoritesMemesQueryOpts())
  }
})
