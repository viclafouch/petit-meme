import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import {
  ALL_CATEGORY_SLUG,
  LEGACY_SORT_CATEGORY_SLUGS,
  MEMES_SEARCH_SCHEMA
} from '~/constants/meme'
import { resolveMemesSort } from '~/helpers/memes-sort'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  countLibraryMemesQueryOpts,
  listCategoriesQueryOpts
} from '~/queries/category'
import { listMemesPagesQueryOpts } from '~/queries/meme'
import { prefetchPublicPageQueries } from '~/routes/_public__root/-lib/prefetch-public-page-queries'
import { MemesLibraryPage } from '~/routes/_public__root/memes/-components/memes-library-page'
import memesLibraryCss from '~/routes/_public__root/memes/-components/memes-library.css?url'

const findLegacySort = (slug: string) => {
  return Object.entries(LEGACY_SORT_CATEGORY_SLUGS).find(([legacySlug]) => {
    return legacySlug === slug
  })?.[1]
}

export const Route = createFileRoute('/_public__root/memes/category/$slug')({
  validateSearch: (search) => {
    return MEMES_SEARCH_SCHEMA.parse(search)
  },
  loaderDeps: ({ search }) => {
    return { query: search.query, page: search.page, sort: search.sort }
  },
  beforeLoad: ({ params, search }) => {
    const legacySort = findLegacySort(params.slug)

    if (legacySort) {
      throw redirect({
        to: '/memes/category/$slug',
        params: { slug: ALL_CATEGORY_SLUG },
        search: {
          ...search,
          sort: legacySort === 'trending' ? undefined : legacySort
        },
        replace: true,
        statusCode: 308
      })
    }
  },
  loader: async ({ context, params, deps }) => {
    prefetchPublicPageQueries({
      queryClient: context.queryClient,
      isSignedIn: Boolean(context.user)
    })

    const categories = await context.queryClient.query({
      ...listCategoriesQueryOpts(getLocale()),
      staleTime: 'static'
    })
    const isAllCategory = params.slug === ALL_CATEGORY_SLUG
    const category = categories.find((item) => {
      return item.slug === params.slug
    })

    if (!isAllCategory && !category) {
      throw notFound()
    }

    await Promise.all([
      context.queryClient.query(countLibraryMemesQueryOpts(getLocale())),
      context.queryClient.infiniteQuery(
        listMemesPagesQueryOpts(
          {
            query: deps.query,
            sort: resolveMemesSort(deps),
            category: isAllCategory ? undefined : params.slug
          },
          deps.page ?? 1
        )
      )
    ])

    return { category }
  },
  head: ({ loaderData, match }) => {
    const category = loaderData?.category
    const locale = getLocale()
    const isSearch = Boolean(match.search.query)
    const pageSuffix =
      match.search.page && match.search.page > 1
        ? `?page=${match.search.page}`
        : ''
    const links = [{ rel: 'stylesheet', href: memesLibraryCss }]

    if (!category) {
      const title = m.meme_seo_library_title()
      const description = m.meme_seo_library_description()
      const seo = buildSeo({
        title,
        pathname: `/memes/category/${ALL_CATEGORY_SLUG}${pageSuffix}`,
        description,
        noindex: isSearch,
        image: buildOgImage(
          { type: 'category', title, subtitle: description, locale },
          title
        )
      })

      return { ...seo, links: [...seo.links, ...links] }
    }

    const description = m.meme_seo_category_description({
      title: category.title
    })
    const seo = buildSeo({
      title: m.meme_seo_category_title({ title: category.title }),
      pathname: `/memes/category/${category.slug}${pageSuffix}`,
      description,
      noindex: isSearch,
      keywords: category.keywords.join(', '),
      image: buildOgImage(
        {
          type: 'category',
          title: category.title,
          subtitle: description,
          locale
        },
        category.title
      )
    })

    return { ...seo, links: [...seo.links, ...links] }
  },
  component: MemesLibraryPage
})
