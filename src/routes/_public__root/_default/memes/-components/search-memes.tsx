import React from 'react'
import { Shuffle, Smartphone } from 'lucide-react'
import mixpanel from 'mixpanel-browser'
import { CategoriesList } from '@/components/categories/categories-list'
import MemesPagination from '@/components/Meme/Filters/memes-pagination'
import { MemesQuery } from '@/components/Meme/Filters/memes-query'
import MemesToggleGrid from '@/components/Meme/Filters/memes-toggle-grid'
import { MemesList } from '@/components/Meme/memes-list'
import { buttonVariants } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'
import type { MemesFilters } from '@/constants/meme'
import {
  getCategoriesListQueryOpts,
  getMemesListQueryOpts
} from '@/lib/queries'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import {
  PageDescription,
  PageHeading
} from '@/routes/_public__root/-components/page-headers'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSearch
} from '@tanstack/react-router'

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

  // eslint-disable-next-line no-restricted-syntax
  const filters = React.useMemo(() => {
    return {
      query: debouncedValue,
      page: search.page,
      category: slug === 'all' ? undefined : slug
    } satisfies MemesFilters
  }, [debouncedValue, search.page, slug])

  const memesListQuery = useSuspenseQuery(getMemesListQueryOpts(filters))

  React.useEffect(() => {
    if (debouncedValue) {
      mixpanel.track('Search', {
        searchQuery: debouncedValue,
        resultsCount: memesListQuery.data.memes.length
      })
    }
  }, [debouncedValue, memesListQuery.data.memes.length])

  const categoryJsonLd = buildCategoryJsonLd(selectedCategory, {
    page: memesListQuery.data.page || 1,
    memes: memesListQuery.data.memes
  })

  const categoryName = selectedCategory?.title ?? 'Tous les mèmes'
  const categoryPath = `/memes/category/${slug}`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Accueil', pathname: '/' },
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

export const SearchMemes = () => {
  const [columnGridCount, setColumnGridCount] = React.useState<number>(4)
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const { slug: activeSlug } = useParams({ strict: false })

  const categories = useSuspenseQuery(getCategoriesListQueryOpts())

  // eslint-disable-next-line no-restricted-syntax
  const currentCategory = React.useMemo(() => {
    return categories.data.find((category) => {
      return category.slug === activeSlug
    })
  }, [categories.data, activeSlug])

  const handleQueryChange = (value: string) => {
    void navigate({
      to: '.',
      search: {
        page: undefined,
        query: value === '' ? undefined : value
      },
      viewTransition: false,
      replace: true
    })
  }

  return (
    <div>
      <PageHeading>
        {currentCategory ? currentCategory.title : 'Tous les mèmes'}
      </PageHeading>
      <PageDescription>
        Tape, clique, rigole : découvre tous les mèmes en un seul endroit.
      </PageDescription>
      <div className="w-full mx-auto py-12">
        <div className="flex flex-col gap-y-4">
          <div className="flex justify-between flex-col sm:flex-row gap-2">
            <MemesQuery
              query={search.query ?? ''}
              onQueryChange={handleQueryChange}
            />
            <div className="gap-x-2 flex shrink-0">
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
                Aléatoire
              </Link>
              <Link
                to="/reels"
                className={cn('flex-1', buttonVariants({ variant: 'outline' }))}
              >
                <Smartphone />
                Mode Reels
              </Link>
            </div>
          </div>
          <div className="w-full border-y border-muted">
            <CategoriesList />
          </div>
          <React.Suspense fallback={<LoadingSpinner />}>
            <MemesListWrapper columnGridCount={columnGridCount} />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
