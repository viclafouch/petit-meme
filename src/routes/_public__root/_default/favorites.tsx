import { MemesList } from '@/components/Meme/memes-list'
import { getFavoritesMemesQueryOpts } from '@/lib/queries'
import {
  PageDescription,
  PageHeading
} from '@/routes/_public__root/-components/page-headers'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

const RouteComponent = () => {
  const favoritesMemeQuery = useSuspenseQuery(getFavoritesMemesQueryOpts())

  return (
    <div>
      <PageHeading>Favoris</PageHeading>
      <PageDescription>
        Tes mèmes préférés, toujours sous la main : retrouve-les ici.
      </PageDescription>
      <div className="w-full mx-auto py-12">
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
        { title: 'Petit Meme - Favoris' },
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
