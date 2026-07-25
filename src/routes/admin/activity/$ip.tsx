import { ArrowLeft, EyeOff } from 'lucide-react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
import { Container } from '~/components/ui/container'
import {
  ACTIVITY_IP_RETENTION_DAYS,
  ACTIVITY_PAGE_SCHEMA
} from '~/constants/activity'
import { formatDate, DATE_WITH_TIME_OPTIONS } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import { ActivityTimeline } from '~/routes/admin/-components/activity-timeline'
import {
  SectionCard,
  SectionHeading
} from '~/routes/admin/-components/section-heading'
import { StatTiles } from '~/routes/admin/-components/stat-tiles'
import {
  buildActivityTiles,
  formatEventCount
} from '~/routes/admin/-helpers/activity'
import {
  getAdminVisitorActivityQueryOpts,
  getAdminVisitorDetailQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  VisitorAccountList,
  VisitorMemeList,
  VisitorUserAgentList
} from './-components/visitor-lists'

const VisitorEmptyState = () => {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <EyeOff className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">Aucun événement pour cette adresse</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Les adresses IP sont purgées automatiquement après{' '}
        {ACTIVITY_IP_RETENTION_DAYS} jours. Cette adresse n&apos;a jamais été
        vue, ou ses événements ont déjà été anonymisés.
      </p>
      <Link
        to="/admin/activity"
        className={buttonVariants({ variant: 'outline' })}
      >
        <ArrowLeft />
        Retour au flux
      </Link>
    </div>
  )
}

const RouteComponent = () => {
  const { ip } = Route.useParams()
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const locale = getLocale()

  const detailQuery = useSuspenseQuery(getAdminVisitorDetailQueryOpts(ip))
  const activityQuery = useQuery(
    getAdminVisitorActivityQueryOpts({ ipAddress: ip, page })
  )

  const handlePageChange = (nextPage: number) => {
    void navigate({
      to: '/admin/activity/$ip',
      params: { ip },
      search: { page: nextPage },
      viewTransition: false,
      replace: true
    })
  }

  const hasEvents = detailQuery.data.summary.total > 0

  return (
    <Container>
      <PageHeader
        title={<span className="font-mono break-all">{ip}</span>}
        description={
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {formatEventCount(detailQuery.data.summary.total)}
              {detailQuery.data.summary.firstSeenAt &&
              detailQuery.data.summary.lastSeenAt
                ? ` · Du ${formatDate(new Date(detailQuery.data.summary.firstSeenAt), locale, DATE_WITH_TIME_OPTIONS)} au ${formatDate(new Date(detailQuery.data.summary.lastSeenAt), locale, DATE_WITH_TIME_OPTIONS)}`
                : null}
            </span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" size="sm">
                Fenêtre de {ACTIVITY_IP_RETENTION_DAYS} jours
              </Badge>
            </div>
          </div>
        }
        action={
          <Link
            to="/admin/activity"
            search={{ page: 1, scope: 'all', search: ip }}
            className={buttonVariants({ variant: 'outline' })}
          >
            Voir dans le flux
          </Link>
        }
      />
      <div className="flex flex-col gap-6 py-10">
        {hasEvents ? (
          <>
            <section aria-label="Totaux d'activité">
              <StatTiles
                tiles={buildActivityTiles(detailQuery.data.summary.totals)}
              />
            </section>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard title="Memes touchés">
                <VisitorMemeList memes={detailQuery.data.memes} />
              </SectionCard>
              <SectionCard title="Comptes associés">
                <VisitorAccountList users={detailQuery.data.users} />
              </SectionCard>
              <SectionCard title="User-agents observés">
                <VisitorUserAgentList
                  userAgents={detailQuery.data.userAgents}
                />
              </SectionCard>
            </div>
            <section aria-label="Journal d'activité">
              <SectionHeading title="Journal d'activité" />
              <ActivityTimeline
                rows={activityQuery.data}
                total={detailQuery.data.summary.total}
                page={page}
                onPageChange={handlePageChange}
                caption={`Activité de ${ip}`}
                isPending={activityQuery.isPending}
                isError={activityQuery.isError}
                error={activityQuery.error}
                scope="visitor"
              />
            </section>
          </>
        ) : (
          <VisitorEmptyState />
        )}
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/activity/$ip')({
  component: RouteComponent,
  validateSearch: ACTIVITY_PAGE_SCHEMA,
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      getAdminVisitorDetailQueryOpts(params.ip)
    )

    return { crumb: params.ip }
  },
  head: ({ params }) => {
    return { meta: [{ title: `Admin Petit Meme - ${params.ip}` }] }
  }
})
