import { getCategoriesListQueryOpts } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { SearchMemes } from '@/routes/_public__root/_default/memes/-components/search-memes'
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_public__root/_default/memes/category/$slug'
)({
  component: SearchMemes,
  loader: async ({ context, params }) => {
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
    if (!loaderData) {
      return {}
    }

    return {
      meta: [
        ...seo({
          title: `Catégorie ${loaderData.category.title}`,
          description: `Découvrez les mèmes de ${loaderData.category.title}. Gratuit et accessible à tous !`,
          keywords: loaderData.category.keywords.join(', ')
        })
      ]
    }
  }
})
