import { Sparkles } from 'lucide-react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useMemesViewEvent } from '~/components/meme/meme-grid'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { serializeJsonLd } from '~/helpers/json-ld'
import { resolveLibraryFilters } from '~/helpers/memes-sort'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd } from '~/lib/seo/json-ld'
import { m } from '~/paraglide/messages'
import { listMemesPagesQueryOpts } from '~/queries/meme'
import { flattenUniqueCards } from '~/routes/_public__root/memes/-lib/library'
import { LibraryHeader, LibraryStrip } from './library-layout'
import { LoadMore, MemeCardGrid } from './meme-card-grid'
import { MemesSortControl } from './memes-sort-control'

const categoryRouteApi = getRouteApi(
  '/_public__root/memes/_library/category/$slug'
)

const useLibraryPages = () => {
  const { slug } = categoryRouteApi.useParams()
  const search = categoryRouteApi.useSearch()

  return useSuspenseInfiniteQuery(
    listMemesPagesQueryOpts(
      resolveLibraryFilters({
        slug,
        query: search.query,
        sort: search.sort
      }),
      search.page ?? 1
    )
  )
}

const EmptyLibrary = () => {
  const { slug } = categoryRouteApi.useParams()
  const query = categoryRouteApi.useSearch({
    select: (search) => {
      return search.query
    }
  })
  const isCategory = slug !== ALL_CATEGORY_SLUG && !query

  return (
    <output className="flex flex-col items-center gap-2 rounded-2xl px-4 py-16 text-center inset-ring inset-ring-foreground/6">
      <p className="max-w-full font-bricolage text-lg font-semibold wrap-anywhere">
        {query ? m.search_no_results({ query }) : m.meme_empty_title()}
      </p>
      <p className="text-sm text-muted-foreground">
        {isCategory ? m.meme_empty_category_hint() : m.meme_empty_ai_hint()}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {isCategory ? (
          <Link
            to="/memes/category/$slug"
            params={{ slug: ALL_CATEGORY_SLUG }}
            className="pill pill-sm"
          >
            {m.meme_empty_see_all()}
          </Link>
        ) : null}
        <Link to="/memes/ai-search" className="pill pill-sm pill-brand">
          <Sparkles aria-hidden="true" />
          {m.search_ask_ai()}
        </Link>
      </div>
    </output>
  )
}

const LibraryJsonLd = () => {
  const { category } = categoryRouteApi.useLoaderData()
  const pagesQuery = useLibraryPages()
  const [firstPage] = pagesQuery.data.pages

  if (!firstPage) {
    return null
  }

  const categoryName = category?.title ?? m.meme_all_memes()
  const categorySlug = category?.slug ?? ALL_CATEGORY_SLUG

  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(
          buildCategoryJsonLd(category, {
            page: firstPage.page,
            memes: firstPage.memes
          })
        )}
      </script>
      <script type="application/ld+json">
        {serializeJsonLd(
          buildBreadcrumbJsonLd([
            { name: m.meme_breadcrumb_home(), pathname: '/' },
            {
              name: categoryName,
              pathname: `/memes/category/${categorySlug}`
            }
          ])
        )}
      </script>
    </>
  )
}

const LibraryGrid = () => {
  const pagesQuery = useLibraryPages()
  const cards = flattenUniqueCards(pagesQuery.data.pages)
  const lastPage = pagesQuery.data.pages.at(-1)
  const authenticatedUserToken = useMemesViewEvent(lastPage?.memes ?? [])

  if (cards.length === 0) {
    return <EmptyLibrary />
  }

  return (
    <MemeCardGrid
      cards={cards}
      now={pagesQuery.dataUpdatedAt}
      authenticatedUserToken={authenticatedUserToken}
    >
      {pagesQuery.hasNextPage && lastPage ? (
        <LoadMore
          isFetching={pagesQuery.isFetchingNextPage}
          hasFailed={pagesQuery.isFetchNextPageError}
          failedMessage={m.error_search_timeout()}
          onLoadMore={() => {
            void pagesQuery.fetchNextPage()
          }}
          render={
            <Link
              to="."
              search={(previous) => {
                return { ...previous, page: lastPage.page + 1 }
              }}
              preload={false}
              resetScroll={false}
            />
          }
        />
      ) : null}
    </MemeCardGrid>
  )
}

const LibraryPageHeader = () => {
  const pagesQuery = useLibraryPages()
  const { category } = categoryRouteApi.useLoaderData()
  const query = categoryRouteApi.useSearch({
    select: (search) => {
      return search.query
    }
  })

  return (
    <LibraryHeader
      title={
        query
          ? m.meme_library_query_title({ query })
          : (category?.title ?? m.meme_all_memes())
      }
      count={pagesQuery.data.pages[0]?.total ?? 0}
    >
      <MemesSortControl />
    </LibraryHeader>
  )
}

export const MemesLibraryPage = () => {
  return (
    <>
      <LibraryPageHeader />
      <LibraryStrip />
      <LibraryGrid />
      <LibraryJsonLd />
    </>
  )
}
