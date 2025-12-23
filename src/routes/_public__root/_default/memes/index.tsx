import { MEMES_SEARCH_SCHEMA } from '@/constants/meme'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { SearchMemes } from '@/routes/_public__root/_default/memes/-components/search-memes'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_public__root/_default/memes/')({
  component: SearchMemes,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getCategoriesListQueryOpts())
  },
  validateSearch: (search) => {
    return MEMES_SEARCH_SCHEMA.parse(search)
  },
  head: () => {
    return {
      meta: [
        ...seo({
          title: 'Bibliothèque de mèmes en ligne',
          description:
            'Découvre la plus grande bibliothèque de mèmes : crée, explore et partage des mèmes légendaires sur Petit Meme. Gratuit et accessible à tous !'
        })
      ]
    }
  }
})
