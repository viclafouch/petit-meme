import { MEMES_SEARCH_SCHEMA, VIRTUAL_CATEGORIES } from '@/constants/meme'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { SearchMemes } from '@/routes/_public__root/_default/memes/-components/search-memes'
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_public__root/_default/memes/category/$slug'
)({
  component: SearchMemes,
  validateSearch: (search) => {
    return MEMES_SEARCH_SCHEMA.parse(search)
  },
  loader: async ({ context, params }) => {
    if (params.slug === 'all') {
      return { category: undefined }
    }

    const virtualCategory = VIRTUAL_CATEGORIES.find((item) => {
      return item.slug === params.slug
    })

    if (virtualCategory) {
      return { category: virtualCategory }
    }

    const categories = await context.queryClient.ensureQueryData(
      getCategoriesListQueryOpts()
    )

    const category = categories.find((item) => {
      return item.slug === params.slug
    })

    if (!category) {
      throw notFound()
    }

    return { category }
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category

    if (!category) {
      return seo({
        title: 'Bibliothèque de mèmes en ligne',
        pathname: '/memes/category/all',
        description:
          'Découvre la plus grande bibliothèque de mèmes : crée, explore et partage des mèmes légendaires sur Petit Meme. Gratuit et accessible à tous !'
      })
    }

    return seo({
      title: `Mèmes ${category.title}`,
      pathname: `/memes/category/${category.slug}`,
      description: `Découvrez les mèmes de ${category.title}. Gratuit et accessible à tous !`,
      keywords: category.keywords.join(', ')
    })
  }
})
