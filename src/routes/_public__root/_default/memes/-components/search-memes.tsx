import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertTriangleIcon, RefreshCw, Shuffle, Smartphone } from 'lucide-react'
import { useDebouncedValue } from '@tanstack/react-pacer'
import {
  QueryErrorResetBoundary,
  useSuspenseQuery
} from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSearch
} from '@tanstack/react-router'
import { CategoriesList } from '~/components/categories/categories-list'
import { MemesFilterLanguage } from '~/components/Meme/Filters/memes-filter-language'
import MemesPagination from '~/components/Meme/Filters/memes-pagination'
import { MemesQuery } from '~/components/Meme/Filters/memes-query'
import MemesToggleGrid from '~/components/Meme/Filters/memes-toggle-grid'
import { MemesList } from '~/components/Meme/memes-list'
import { Button, buttonVariants } from '~/components/ui/button'
import { LoadingSpinner } from '~/components/ui/spinner'
import { getVirtualCategories, type MemesFilters } from '~/constants/meme'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import {
  parseContentLocalesParam,
  serializeContentLocalesParam
} from '~/helpers/i18n-content'
import {
  getCategoriesListQueryOpts,
  getMemesListQueryOpts
} from '~/lib/queries'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd } from '~/lib/seo'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'

const MemesListWrapper = ({ columnGridCount }: { columnGridCount: number }) => {
  const search = useSearch({
    from: '/_public__root/_default/memes/category/$slug'
  })
  const { slug } = useParams({
    from: '/_public__root/_default/memes/category/$slug'
  })
  const selectedCategory = useLoaderData({
    from: '/_public__root/_default/memes/category/$slug'
  }).category

  const [debouncedValue] = useDebouncedValue(search.query, {
    wait: 300,
    leading: false
  })

  const filters = React.useMemo(() => {
    return {
      query: debouncedValue,
      page: search.page,
      category: slug === 'all' ? undefined : slug,
      contentLocales: search.contentLocales
    } satisfies MemesFilters
  }, [debouncedValue, search.page, slug, search.contentLocales])

  const memesListQuery = useSuspenseQuery(getMemesListQueryOpts(filters))

  const categoryJsonLd = buildCategoryJsonLd(selectedCategory, {
    page: memesListQuery.data.page || 1,
    memes: memesListQuery.data.memes
  })

  const categoryName = selectedCategory?.title ?? m.meme_all_memes()
  const categoryPath = `/memes/category/${slug}`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: m.meme_breadcrumb_home(), pathname: '/' },
    { name: categoryName, pathname: categoryPath }
  ])

  return (
    <div className="w-full flex flex-col gap-12">
      <script type="application/ld+json">
        {JSON.stringify(categoryJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </script>
      <MemesList
        columnGridCount={columnGridCount}
        layoutContext="library"
        memes={memesListQuery.data.memes}
        queryID={memesListQuery.data.queryID}
        page={memesListQuery.data.page}
      />
      <div className="flex justify-end z-0">
        <MemesPagination
          currentPage={(memesListQuery.data.page || 0) + 1}
          totalPages={memesListQuery.data.totalPages ?? 0}
          slug={slug}
        />
      </div>
    </div>
  )
}

const MemesListErrorFallback = ({
  resetErrorBoundary
}: {
  resetErrorBoundary: () => void
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12"
    >
      <AlertTriangleIcon
        className="size-6 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-center text-sm text-muted-foreground">
        {m.error_search_timeout()}
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        <RefreshCw className="size-4" />
        {m.common_retry()}
      </Button>
    </div>
  )
}

export const SearchMemes = () => {
  const [columnGridCount, setColumnGridCount] = React.useState<number>(4)
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const { slug: activeSlug } = useParams({ strict: false })

  const categories = useSuspenseQuery(getCategoriesListQueryOpts(getLocale()))

  const currentCategory = React.useMemo(() => {
    return [...getVirtualCategories(), ...categories.data].find((category) => {
      return category.slug === activeSlug
    })
  }, [categories.data, activeSlug])

  const locale = getLocale()
  const rawContentLocales =
    typeof search.contentLocales === 'string'
      ? search.contentLocales
      : undefined
  const parsedContentLocales = parseContentLocalesParam(
    rawContentLocales,
    locale
  )

  const handleQueryChange = (value: string) => {
    void navigate({
      to: '.',
      search: {
        page: undefined,
        query: value === '' ? undefined : value,
        contentLocales: search.contentLocales
      },
      viewTransition: false,
      replace: true
    })
  }

  const handleContentLocalesChange = (
    newContentLocales: MemeContentLocale[]
  ) => {
    void navigate({
      to: '.',
      search: {
        page: undefined,
        query: search.query,
        contentLocales: serializeContentLocalesParam(newContentLocales, locale)
      },
      viewTransition: false,
      replace: true
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>
          {currentCategory ? currentCategory.title : m.meme_all_memes()}
        </PageHeading>
        <PageDescription>{m.meme_search_description()}</PageDescription>
      </div>
      <div className="w-full mx-auto">
        <div className="flex flex-col gap-y-4">
          <div className="flex justify-between flex-col sm:flex-row gap-2">
            <MemesQuery
              query={search.query ?? ''}
              onQueryChange={handleQueryChange}
            />
            <div className="gap-x-2 flex shrink-0">
              <MemesFilterLanguage
                contentLocales={parsedContentLocales}
                onContentLocalesChange={handleContentLocalesChange}
              />
              <div className="hidden lg:flex">
                <MemesToggleGrid
                  columnValue={columnGridCount}
                  onColumnValueChange={setColumnGridCount}
                />
              </div>
              <Link
                to="/random"
                className={cn('flex-1', buttonVariants({ variant: 'outline' }))}
              >
                <Shuffle />
                {m.meme_random()}
              </Link>
              <Link
                to="/reels"
                className={cn('flex-1', buttonVariants({ variant: 'outline' }))}
              >
                <Smartphone />
                {m.meme_reels_mode()}
              </Link>
            </div>
          </div>
          <div className="w-full border-y border-muted">
            <CategoriesList />
          </div>
          <QueryErrorResetBoundary>
            {({ reset }) => {
              return (
                <ErrorBoundary
                  onReset={reset}
                  FallbackComponent={MemesListErrorFallback}
                >
                  <React.Suspense fallback={<LoadingSpinner />}>
                    <MemesListWrapper columnGridCount={columnGridCount} />
                  </React.Suspense>
                </ErrorBoundary>
              )
            }}
          </QueryErrorResetBoundary>
        </div>
      </div>
    </div>
  )
}
