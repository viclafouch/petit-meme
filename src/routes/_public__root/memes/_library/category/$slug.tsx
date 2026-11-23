import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { HTTP_STATUS } from '~/constants/http'
import {
  ALL_CATEGORY_SLUG,
  LEGACY_SORT_CATEGORY_SLUGS,
  MEMES_SEARCH_SCHEMA
} from '~/constants/meme'
import { resolveLibraryFilters } from '~/helpers/memes-sort'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  countLibraryMemesQueryOpts,
  listCategoriesQueryOpts
} from '~/queries/category'
import { listMemesPagesQueryOpts } from '~/queries/meme'
import { buildLibraryDescription } from '~/routes/_public__root/memes/-lib/library'
import { MemesLibraryPage } from '~/routes/_public__root/memes/_library/-components/memes-library-page'

const findLegacySort = (slug: string) => {
  return Object.entries(LEGACY_SORT_CATEGORY_SLUGS).find(([legacySlug]) => {
    return legacySlug === slug
  })?.[1]
}

export const Route = createFileRoute(
  '/_public__root/memes/_library/category/$slug'
)({
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
        statusCode: HTTP_STATUS.PERMANENT_REDIRECT
      })
    }
  },
  loader: async ({ context, params, deps }) => {
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

    const firstPageNumber = deps.page ?? 1
    const [libraryCount, memesPages] = await Promise.all([
      context.queryClient.query(countLibraryMemesQueryOpts(getLocale())),
      context.queryClient.infiniteQuery(
        listMemesPagesQueryOpts(
          resolveLibraryFilters({
            slug: params.slug,
            query: deps.query,
            sort: deps.sort
          }),
          firstPageNumber
        )
      )
    ])
    const firstPageMemes = memesPages.pages[0]?.memes ?? []
    const isEmpty = firstPageMemes.length === 0

    if (isEmpty && firstPageNumber > 1) {
      throw notFound()
    }

    return {
      category,
      isEmpty,
      description: buildLibraryDescription({
        categoryTitle: category?.title,
        count: category ? category.memeCount : libraryCount,
        exampleTitles: firstPageMemes.map((meme) => {
          return meme.title
        }),
        locale: getLocale()
      })
    }
  },
  head: ({ loaderData, match }) => {
    const category = loaderData?.category
    const locale = getLocale()
    const isSearch = Boolean(match.search.query)
    const pageSuffix =
      match.search.page && match.search.page > 1
        ? `?page=${match.search.page}`
        : ''
    if (!category) {
      const title = m.meme_seo_library_title()
      const seo = buildSeo({
        title,
        pathname: `/memes/category/${ALL_CATEGORY_SLUG}${pageSuffix}`,
        description: loaderData?.description,
        noindex: isSearch || loaderData?.isEmpty,
        image: buildOgImage(
          {
            type: 'category',
            title,
            subtitle: m.meme_seo_library_description(),
            locale
          },
          title
        )
      })

      return seo
    }

    const seo = buildSeo({
      title: m.meme_seo_category_title({ title: category.title }),
      pathname: `/memes/category/${category.slug}${pageSuffix}`,
      description: loaderData?.description,
      noindex: isSearch || loaderData?.isEmpty,
      keywords: category.keywords.join(', '),
      image: buildOgImage(
        {
          type: 'category',
          title: category.title,
          subtitle: m.meme_seo_category_description({ title: category.title }),
          locale
        },
        category.title
      )
    })

    return seo
  },
  component: MemesLibraryPage
})
