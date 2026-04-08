import { createFileRoute, notFound } from '@tanstack/react-router'
import { getVirtualCategories, MEMES_SEARCH_SCHEMA } from '~/constants/meme'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { SearchMemes } from '~/routes/_public__root/_default/memes/-components/search-memes'

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

    const virtualCategory = getVirtualCategories().find((item) => {
      return item.slug === params.slug
    })

    if (virtualCategory) {
      return { category: virtualCategory }
    }

    const categories = await context.queryClient.ensureQueryData(
      getCategoriesListQueryOpts(getLocale())
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
    const locale = getLocale()

    if (!category) {
      const title = m.meme_seo_library_title()
      const description = m.meme_seo_library_description()

      return seo({
        title,
        pathname: '/memes/category/all',
        description,
        image: buildOgImageUrl({
          type: 'category',
          title,
          subtitle: description,
          locale
        }),
        imageAlt: title
      })
    }

    const description = m.meme_seo_category_description({
      title: category.title
    })

    return seo({
      title: m.meme_seo_category_title({ title: category.title }),
      pathname: `/memes/category/${category.slug}`,
      description,
      keywords: category.keywords.join(', '),
      image: buildOgImageUrl({
        type: 'category',
        title: category.title,
        subtitle: description,
        locale
      }),
      imageAlt: category.title
    })
  }
})
