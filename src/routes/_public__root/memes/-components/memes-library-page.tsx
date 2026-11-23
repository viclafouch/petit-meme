import React from 'react'
import { Sparkles } from 'lucide-react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { MemeCard } from '~/components/meme/meme-card'
import memeCardCss from '~/components/meme/meme-card.css?url'
import {
  toThumbnailPriority,
  useMemesViewEvent
} from '~/components/meme/meme-grid'
import { LoadingSpinner } from '~/components/ui/spinner'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { serializeJsonLd } from '~/helpers/json-ld'
import { resolveLibraryFilters } from '~/helpers/memes-sort'
import { formatCount } from '~/helpers/number'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd } from '~/lib/seo/json-ld'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listMemesPagesQueryOpts } from '~/queries/meme'
import { flattenUniqueCards } from '~/routes/_public__root/memes/-lib/library'
import { CategoryDirectory, QuickCategories } from './category-directory'
import { MemesSortControl } from './memes-sort-control'

const categoryRouteApi = getRouteApi('/_public__root/memes/category/$slug')

const LOAD_MORE_ROOT_MARGIN = '0px 0px 50% 0px'

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

type LibraryTitleProps = {
  total: number
}

const LibraryTitle = ({ total }: LibraryTitleProps) => {
  const { category } = categoryRouteApi.useLoaderData()
  const query = categoryRouteApi.useSearch({
    select: (search) => {
      return search.query
    }
  })
  const title = query
    ? m.meme_library_query_title({ query })
    : (category?.title ?? m.meme_all_memes())

  return (
    <div className="flex min-w-0 flex-[1_1_15rem] flex-wrap items-baseline gap-x-3">
      <h1 className="min-w-0 font-bricolage text-xl leading-[1.1] font-semibold tracking-[-0.02em] wrap-anywhere lg:text-3xl">
        {title}
      </h1>
      <p
        aria-live="polite"
        className="text-sm whitespace-nowrap text-muted-foreground tabular-nums"
      >
        {m.meme_library_count({
          count: total,
          formattedCount: formatCount(total, getLocale(), 'standard')
        })}
      </p>
    </div>
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

type LoadMoreProps = {
  nextPage: number
  isFetching: boolean
  hasFailed: boolean
  onLoadMore: () => void
}

const LoadMore = ({
  nextPage,
  isFetching,
  hasFailed,
  onLoadMore
}: LoadMoreProps) => {
  const search = categoryRouteApi.useSearch()
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const onLoadMoreEvent = React.useEffectEvent(onLoadMore)

  React.useEffect(() => {
    const sentinel = sentinelRef.current

    if (!sentinel || isFetching || hasFailed) {
      return () => {}
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMoreEvent()
        }
      },
      { rootMargin: LOAD_MORE_ROOT_MARGIN }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [isFetching, hasFailed])

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-3 pt-10">
      {hasFailed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {m.error_search_timeout()}
        </p>
      ) : null}
      <Link
        to="."
        search={{ ...search, page: nextPage }}
        preload={false}
        resetScroll={false}
        className="pill pill-sm"
        aria-disabled={isFetching || undefined}
        onClick={(event) => {
          event.preventDefault()

          if (!isFetching) {
            onLoadMore()
          }
        }}
      >
        {isFetching ? <LoadingSpinner /> : null}
        {hasFailed ? m.common_retry() : m.meme_load_more()}
      </Link>
    </div>
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
    <div className="meme-grid-wrap">
      <link rel="stylesheet" href={memeCardCss} precedence="default" />
      <ul className="meme-grid" aria-label={m.meme_list_label()}>
        {cards.map((card, index) => {
          return (
            <li key={card.meme.id}>
              <MemeCard
                meme={card.meme}
                now={pagesQuery.dataUpdatedAt}
                titleTag="h2"
                queryID={card.queryID}
                position={card.position}
                authenticatedUserToken={authenticatedUserToken}
                priority={toThumbnailPriority(index)}
              />
            </li>
          )
        })}
      </ul>
      {pagesQuery.hasNextPage && lastPage ? (
        <LoadMore
          nextPage={lastPage.page + 1}
          isFetching={pagesQuery.isFetchingNextPage}
          hasFailed={pagesQuery.isFetchNextPageError}
          onLoadMore={() => {
            void pagesQuery.fetchNextPage()
          }}
        />
      ) : null}
    </div>
  )
}

const LibraryHeader = () => {
  const pagesQuery = useLibraryPages()
  const total = pagesQuery.data.pages[0]?.total ?? 0

  return (
    <header className="pb-3 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <LibraryTitle total={total} />
        <MemesSortControl />
      </div>
    </header>
  )
}

export const MemesLibraryPage = () => {
  return (
    <div className="mx-auto w-full max-w-440 px-3 pt-5 pb-10 sm:px-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-[clamp(1.5rem,3vw,3rem)] lg:pt-10 lg:pb-12">
      <aside className="memes-library-sidebar max-lg:hidden">
        <CategoryDirectory />
      </aside>
      <div className="min-w-0">
        <LibraryHeader />
        <div className="sticky top-(--navbar-space) z-(--z-controls) -mx-3 mb-4 bg-background px-3 py-1 sm:-mx-4 sm:px-4 lg:hidden">
          <QuickCategories />
        </div>
        <LibraryGrid />
        <LibraryJsonLd />
      </div>
    </div>
  )
}
