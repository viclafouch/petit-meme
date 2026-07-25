import { RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { PageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Container } from '~/components/ui/container'
import { LoadingSpinner } from '~/components/ui/spinner'
import { ACTIVITY_FILTERS_SCHEMA } from '~/constants/activity'
import type { ActivityFilters } from '~/constants/activity'
import { getErrorMessage } from '~/helpers/error'
import {
  AdminTable,
  getRowId,
  PAGE_SIZE
} from '~/routes/admin/-components/admin-table'
import { formatEventCount } from '~/routes/admin/-helpers/activity'
import { getAdminActivityQueryOpts } from '~/routes/admin/-lib/queries'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'
import { ACTIVITY_COLUMNS } from './-components/activity-columns'
import { ActivityFilterBar } from './-components/activity-filters'

const EMPTY_ROWS: AdminActivityRow[] = []

// oxlint-disable-next-line react/react-compiler -- useReactTable is flagged as incompatible library
const RouteComponent = () => {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const activityQuery = useQuery(getAdminActivityQueryOpts(search))

  const total = activityQuery.data?.total ?? 0

  const updateSearch = (nextFilters: Partial<ActivityFilters>) => {
    void navigate({
      to: '/admin/activity',
      search: (prevState) => {
        return { ...prevState, ...nextFilters }
      },
      viewTransition: false,
      replace: true
    })
  }

  const handleFiltersChange = (nextFilters: Partial<ActivityFilters>) => {
    updateSearch({ ...nextFilters, page: 1 })
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const currentPagination = {
      pageIndex: search.page - 1,
      pageSize: PAGE_SIZE
    }
    const nextPagination =
      typeof updater === 'function' ? updater(currentPagination) : updater

    updateSearch({ page: nextPagination.pageIndex + 1 })
  }

  const handleRefresh = () => {
    void activityQuery.refetch()
  }

  const table = useReactTable({
    data: activityQuery.data?.rows ?? EMPTY_ROWS,
    columns: ACTIVITY_COLUMNS,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / PAGE_SIZE),
    state: {
      pagination: { pageIndex: search.page - 1, pageSize: PAGE_SIZE }
    },
    onPaginationChange: handlePaginationChange
  })

  return (
    <Container>
      <PageHeader
        title="Activité"
        description={
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {formatEventCount(total)}
          </p>
        }
        action={
          <Button
            variant="outline"
            onClick={handleRefresh}
            aria-busy={activityQuery.isFetching}
          >
            <RefreshCw
              data-fetching={activityQuery.isFetching}
              className="data-[fetching=true]:animate-spin"
            />
            Rafraîchir
          </Button>
        }
      />
      <div className="flex flex-col gap-4 py-10">
        <ActivityFilterBar
          filters={search}
          onFiltersChange={handleFiltersChange}
        />
        {activityQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(activityQuery.error)}
          </p>
        ) : null}
        {activityQuery.isPending ? (
          <div
            role="status"
            aria-label="Chargement de l'activité"
            className="py-10"
          >
            <LoadingSpinner />
          </div>
        ) : (
          <AdminTable table={table} caption="Flux d'activité" />
        )}
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/activity/')({
  component: RouteComponent,
  validateSearch: ACTIVITY_FILTERS_SCHEMA,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Activité' }] }
  },
  loader: () => {
    return { crumb: 'Activité' }
  }
})
