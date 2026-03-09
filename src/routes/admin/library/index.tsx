import React from 'react'
import { Plus } from 'lucide-react'
import { MemesFilterStatus } from '@/components/Meme/Filters/memes-filter-status'
import { MemesQuery } from '@/components/Meme/Filters/memes-query'
import { PageHeader } from '@/components/page-header'
import { Paginator } from '@/components/paginator'
import { Container } from '@/components/ui/container'
import { LoadingSpinner } from '@/components/ui/spinner'
import { MEMES_FILTERS_SCHEMA, type MemesFilters } from '@/constants/meme'
import { MemeListItem } from '@admin/-components/meme-list-item'
import { MemesFilterContentLocale } from '@admin/-components/memes-filter-content-locale'
import { NewMemeButton } from '@admin/-components/new-meme-button'
import { getAdminMemesListQueryOpts } from '@admin/-lib/queries'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const MemesListWrapper = () => {
  const search = Route.useSearch()

  const [debouncedValue] = useDebouncedValue(search.query, {
    wait: 300,
    leading: false
  })

  const filters = {
    query: debouncedValue,
    page: search.page,
    status: search.status,
    contentLocale: search.contentLocale
  }

  const memesListQuery = useSuspenseQuery(getAdminMemesListQueryOpts(filters))

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {memesListQuery.data.memes.map((meme) => {
          return <MemeListItem key={meme.id} meme={meme} />
        })}
      </div>
      <div className="flex justify-end z-0">
        <Paginator
          currentPage={(memesListQuery.data.page || 0) + 1}
          totalPages={memesListQuery.data.totalPages ?? 0}
          getLinkProps={(page) => {
            return {
              to: '/admin/library',
              search: (prevState) => {
                return {
                  page,
                  query: prevState.query,
                  status: prevState.status,
                  contentLocale: prevState.contentLocale
                }
              }
            }
          }}
          showPreviousNext
        />
      </div>
    </div>
  )
}

const RouteComponent = () => {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const handleFilterChange = <TKey extends keyof MemesFilters>(
    key: TKey,
    value: MemesFilters[TKey] | null
  ) => {
    void navigate({
      to: '/admin/library',
      search: (prevState) => {
        return {
          ...prevState,
          page: 1,
          [key]: value ?? undefined
        }
      },
      viewTransition: false,
      replace: true
    })
  }

  const handleQueryChange = (value: string) => {
    return handleFilterChange('query', value)
  }

  const handleContentLocaleChange = (
    value: MemesFilters['contentLocale'] | null
  ) => {
    return handleFilterChange('contentLocale', value)
  }

  const handleStatusChange = (value: MemesFilters['status'] | null) => {
    return handleFilterChange('status', value)
  }

  return (
    <Container>
      <PageHeader
        title="Memes"
        action={
          <NewMemeButton>
            <Plus /> Ajouter un mème
          </NewMemeButton>
        }
      />
      <div className="py-10">
        <div className="flex flex-col gap-4">
          <div className="border-b border-muted pb-4 flex justify-between gap-x-3">
            <MemesQuery
              query={search.query ?? ''}
              onQueryChange={handleQueryChange}
            />
            <div className="flex gap-2">
              <MemesFilterContentLocale
                contentLocale={search.contentLocale ?? null}
                onContentLocaleChange={handleContentLocaleChange}
              />
              <MemesFilterStatus
                status={search.status ?? null}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
          <React.Suspense fallback={<LoadingSpinner />}>
            <MemesListWrapper />
          </React.Suspense>
        </div>
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/library/')({
  component: RouteComponent,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Librairie' }] }
  },
  validateSearch: (search) => {
    return MEMES_FILTERS_SCHEMA.parse(search)
  },
  loader: () => {
    return {
      crumb: 'Librairie'
    }
  }
})
