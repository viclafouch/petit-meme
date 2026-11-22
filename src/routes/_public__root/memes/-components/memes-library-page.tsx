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
import { ALL_CATEGORY_SLUG, MEMES_PER_PAGE } from '~/constants/meme'
import { serializeJsonLd } from '~/helpers/json-ld'
import { resolveMemesSort } from '~/helpers/memes-sort'
import { formatCount } from '~/helpers/number'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd } from '~/lib/seo/json-ld'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listMemesPagesQueryOpts } from '~/queries/meme'
import { CategoryDirectory, QuickCategories } from './category-directory'
import { MemesSortControl } from './memes-sort-control'

const categoryRouteApi = getRouteApi('/_public__root/memes/category/$slug')

const LOAD_MORE_ROOT_MARGIN = '0px 0px 50% 0px'

const useLibraryPages = () => {
  const { slug } = categoryRouteApi.useParams()
  const search = categoryRouteApi.useSearch()

  return useSuspenseInfiniteQuery(
    listMemesPagesQueryOpts(
      {
        query: search.query,
        sort: resolveMemesSort(search),
        category: slug === ALL_CATEGORY_SLUG ? undefined : slug
      },
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
    <div className="memes-library-title">
      <h1>{title}</h1>
      <p aria-live="polite">
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
    <output className="memes-library-empty">
      <p className="memes-library-empty-title">
        {query ? m.search_no_results({ query }) : m.meme_empty_title()}
      </p>
      <p className="memes-library-empty-hint">
        {isCategory ? m.meme_empty_category_hint() : m.meme_empty_ai_hint()}
      </p>
      <div className="memes-library-empty-actions">
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
    <div ref={sentinelRef} className="memes-library-more">
      {hasFailed ? (
        <p role="alert" className="memes-library-empty-hint">
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

type LibraryPage = ReturnType<typeof useLibraryPages>['data']['pages'][number]

const flattenUniqueCards = (pages: LibraryPage[]) => {
  const seenIds = new Set<string>()

  return pages.flatMap((page) => {
    return page.memes.flatMap((meme, indexInPage) => {
      if (seenIds.has(meme.id)) {
        return []
      }

      seenIds.add(meme.id)

      return [
        {
          meme,
          queryID: page.queryID,
          position: (page.page - 1) * MEMES_PER_PAGE + indexInPage + 1
        }
      ]
    })
  })
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
    <header className="memes-library-head">
      <div className="memes-library-head-row">
        <LibraryTitle total={total} />
        <MemesSortControl />
      </div>
    </header>
  )
}

export const MemesLibraryPage = () => {
  return (
    <div className="memes-library">
      <aside className="memes-library-sidebar max-lg:hidden">
        <CategoryDirectory />
      </aside>
      <div className="memes-library-main">
        <LibraryHeader />
        <div className="memes-library-quick lg:hidden">
          <QuickCategories />
        </div>
        <LibraryGrid />
        <LibraryJsonLd />
      </div>
    </div>
  )
}
