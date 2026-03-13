import React from 'react'
import { Plus } from 'lucide-react'
import { MemesQuery } from '@/components/Meme/Filters/memes-query'
import { PageHeader } from '@/components/page-header'
import { Paginator } from '@/components/paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { LoadingSpinner } from '@/components/ui/spinner'
import { MEMES_FILTERS_SCHEMA, type MemesFilters } from '@/constants/meme'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { MemeListItem } from '@admin/-components/meme-list-item'
import { MemesFilterContentLocale } from '@admin/-components/memes-filter-content-locale'
import { NewMemeButton } from '@admin/-components/new-meme-button'
import {
  getAdminDashboardTotalsQueryOpts,
  getAdminMemesListQueryOpts
} from '@admin/-lib/queries'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
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
      <ul
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-label="Liste des mèmes"
      >
        {memesListQuery.data.memes.map((meme) => {
          return (
            <li key={meme.id}>
              <MemeListItem meme={meme} />
            </li>
          )
        })}
      </ul>
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

const StatusToggle = ({
  isFilteringPending,
  pendingCount,
  onSelectAll,
  onSelectPending
}: {
  isFilteringPending: boolean
  pendingCount: number | undefined
  onSelectAll: () => void
  onSelectPending: () => void
}) => {
  const hasPendingCount = pendingCount !== undefined

  return (
    <div className="flex gap-1.5" role="group" aria-label="Filtrer par statut">
      <Button
        type="button"
        variant={isFilteringPending ? 'outline' : 'default'}
        size="sm"
        onClick={onSelectAll}
        aria-pressed={!isFilteringPending}
      >
        Tous
      </Button>
      <Button
        type="button"
        variant={isFilteringPending ? 'default' : 'outline'}
        size="sm"
        className={
          isFilteringPending
            ? 'bg-info text-info-foreground hover:bg-info/90'
            : ''
        }
        onClick={onSelectPending}
        aria-pressed={isFilteringPending}
      >
        En attente
        {hasPendingCount && pendingCount > 0 ? (
          <Badge variant={isFilteringPending ? 'secondary' : 'info'} size="sm">
            {pendingCount}
          </Badge>
        ) : null}
      </Button>
    </div>
  )
}

const RouteComponent = () => {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const dashboardTotalsQuery = useQuery(getAdminDashboardTotalsQueryOpts())

  const isFilteringPending = search.status === MemeStatus.PENDING

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

  const handleSelectAll = () => {
    return handleFilterChange('status', null)
  }

  const handleSelectPending = () => {
    return handleFilterChange('status', MemeStatus.PENDING)
  }

  return (
    <Container>
      <PageHeader
        title="Memes"
        action={
          <NewMemeButton>
            <Plus aria-hidden="true" /> Ajouter un mème
          </NewMemeButton>
        }
      />
      <div className="py-10">
        <div className="flex flex-col gap-4">
          <div aria-live="polite" className="sr-only">
            {isFilteringPending
              ? 'Filtre actif : mèmes en attente'
              : 'Affichage de tous les mèmes'}
          </div>
          <div className="border-b border-muted pb-4 flex flex-col gap-3">
            <StatusToggle
              isFilteringPending={isFilteringPending}
              pendingCount={dashboardTotalsQuery.data?.pendingMemes}
              onSelectAll={handleSelectAll}
              onSelectPending={handleSelectPending}
            />
            <div className="flex items-center justify-between gap-x-3">
              <MemesQuery
                query={search.query ?? ''}
                onQueryChange={handleQueryChange}
              />
              <MemesFilterContentLocale
                contentLocale={search.contentLocale ?? null}
                onContentLocaleChange={handleContentLocaleChange}
              />
            </div>
          </div>
          <React.Suspense
            fallback={
              <div role="status" aria-label="Chargement des mèmes">
                <LoadingSpinner />
              </div>
            }
          >
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
