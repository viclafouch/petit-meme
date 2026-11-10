import React from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Paginator } from '~/components/paginator'
import { SearchInput } from '~/components/search-input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Container } from '~/components/ui/container'
import { LoadingSpinner } from '~/components/ui/spinner'
import type { AdminMemesFilters } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { MemeListItem } from '~/routes/admin/-components/meme-list-item'
import { MemesFilterContentLocale } from '~/routes/admin/-components/memes-filter-content-locale'
import { NewMemeButton } from '~/routes/admin/-components/new-meme-button'
import {
  getAdminDashboardTotalsQueryOpts,
  getAdminMemesListQueryOpts
} from '~/routes/admin/-lib/queries'

const routeApi = getRouteApi('/admin/library/')

const MemesListWrapper = () => {
  const search = routeApi.useSearch()

  const filters = {
    query: search.query,
    page: search.page,
    status: search.status,
    contentLocale: search.contentLocale,
    ready: search.ready
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
          currentPage={(memesListQuery.data.page ?? 0) + 1}
          totalPages={memesListQuery.data.totalPages ?? 0}
          getLinkProps={(page) => {
            return {
              to: '/admin/library',
              search: (prevState) => {
                return {
                  page,
                  query: prevState.query,
                  status: prevState.status,
                  contentLocale: prevState.contentLocale,
                  ready: prevState.ready
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

type LibraryView = 'all' | 'pending' | 'ready'

type ViewOption = {
  view: LibraryView
  label: string
  count: number | undefined
  activeClassName: string
  badgeVariant: 'info' | 'success' | undefined
}

type ViewToggleProps = {
  activeView: LibraryView
  options: readonly ViewOption[]
  onSelect: (view: LibraryView) => void
}

const ViewToggle = ({ activeView, options, onSelect }: ViewToggleProps) => {
  return (
    <fieldset
      className="flex min-w-0 flex-wrap gap-1.5"
      aria-label="Filtrer par statut"
    >
      {options.map((option) => {
        const isActive = option.view === activeView

        return (
          <Button
            key={option.view}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={isActive ? option.activeClassName : ''}
            onClick={() => {
              onSelect(option.view)
            }}
            aria-pressed={isActive}
          >
            {option.label}
            {option.badgeVariant &&
            option.count !== undefined &&
            option.count > 0 ? (
              <Badge
                variant={isActive ? 'secondary' : option.badgeVariant}
                size="sm"
              >
                {option.count}
              </Badge>
            ) : null}
          </Button>
        )
      })}
    </fieldset>
  )
}

const VIEW_FILTERS = {
  all: { status: undefined, ready: undefined },
  pending: { status: MemeStatus.PENDING, ready: undefined },
  ready: { status: undefined, ready: true }
} as const satisfies Record<
  LibraryView,
  Pick<AdminMemesFilters, 'status' | 'ready'>
>

const VIEW_ANNOUNCEMENTS = {
  all: 'Affichage de tous les mèmes',
  pending: 'Filtre actif : mèmes en attente',
  ready: 'Filtre actif : brouillons prêts à relire'
} as const satisfies Record<LibraryView, string>

const resolveLibraryView = (filters: AdminMemesFilters): LibraryView => {
  if (filters.ready) {
    return 'ready'
  }

  return filters.status === MemeStatus.PENDING ? 'pending' : 'all'
}

export const LibraryPage = () => {
  const navigate = routeApi.useNavigate()
  const search = routeApi.useSearch()

  const dashboardTotalsQuery = useQuery(getAdminDashboardTotalsQueryOpts())

  const activeView = resolveLibraryView(search)

  const viewOptions = [
    {
      view: 'all',
      label: 'Tous',
      count: undefined,
      activeClassName: '',
      badgeVariant: undefined
    },
    {
      view: 'pending',
      label: 'En attente',
      count: dashboardTotalsQuery.data?.pendingMemes,
      activeClassName: 'bg-info text-info-foreground hover:bg-info/90',
      badgeVariant: 'info'
    },
    {
      view: 'ready',
      label: 'Prêts à relire',
      count: dashboardTotalsQuery.data?.readyMemeDrafts,
      activeClassName: 'bg-success text-success-foreground hover:bg-success/90',
      badgeVariant: 'success'
    }
  ] as const satisfies readonly ViewOption[]

  const handleFilterChange = <TKey extends keyof AdminMemesFilters>(
    key: TKey,
    value: AdminMemesFilters[TKey] | null
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
    handleFilterChange('query', value)
  }

  const handleContentLocaleChange = (
    value: AdminMemesFilters['contentLocale'] | null
  ) => {
    handleFilterChange('contentLocale', value)
  }

  const handleSelectView = (view: LibraryView) => {
    void navigate({
      to: '/admin/library',
      search: (prevState) => {
        return { ...prevState, page: 1, ...VIEW_FILTERS[view] }
      },
      viewTransition: false,
      replace: true
    })
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
            {VIEW_ANNOUNCEMENTS[activeView]}
          </div>
          <div className="border-b border-muted pb-4 flex flex-col gap-3">
            <ViewToggle
              activeView={activeView}
              options={viewOptions}
              onSelect={handleSelectView}
            />
            <div className="flex items-center justify-between gap-x-3">
              <SearchInput
                value={search.query ?? ''}
                placeholder="Rechercher un mème"
                onValueChange={handleQueryChange}
              />
              <MemesFilterContentLocale
                contentLocale={search.contentLocale ?? null}
                onContentLocaleChange={handleContentLocaleChange}
              />
            </div>
          </div>
          <React.Suspense
            fallback={
              <output aria-label="Chargement des mèmes" className="block">
                <LoadingSpinner />
              </output>
            }
          >
            <MemesListWrapper />
          </React.Suspense>
        </div>
      </div>
    </Container>
  )
}
