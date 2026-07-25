import { RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Container } from '~/components/ui/container'
import { ACTIVITY_FILTERS_SCHEMA } from '~/constants/activity'
import type { ActivityFilters } from '~/constants/activity'
import { ActivityTimeline } from '~/routes/admin/-components/activity-timeline'
import { formatEventCount } from '~/routes/admin/-helpers/activity'
import { getAdminActivityQueryOpts } from '~/routes/admin/-lib/queries'
import { ActivityFilterBar } from './-components/activity-filters'

const RouteComponent = () => {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const activityQuery = useQuery(getAdminActivityQueryOpts(search))

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

  const handlePageChange = (page: number) => {
    updateSearch({ page })
  }

  const handleRefresh = () => {
    void activityQuery.refetch()
  }

  return (
    <Container>
      <PageHeader
        title="Activité"
        description={
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {formatEventCount(activityQuery.data?.total ?? 0)}
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
        <ActivityTimeline
          rows={activityQuery.data?.rows}
          total={activityQuery.data?.total ?? 0}
          page={search.page}
          onPageChange={handlePageChange}
          caption="Flux d'activité"
          scope="global"
          isPending={activityQuery.isPending}
          isError={activityQuery.isError}
          error={activityQuery.error}
        />
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
