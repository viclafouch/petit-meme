import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import { UserAvatar } from '~/components/user-avatar'
import {
  ACTIVITY_IP_RETENTION_DAYS,
  ACTIVITY_PAGE_SCHEMA,
  ACTIVITY_RETENTION_DAYS
} from '~/constants/activity'
import { DATE_WITH_TIME_OPTIONS, formatDate } from '~/helpers/date'
import { cn } from '~/lib/utils'
import { getLocale } from '~/paraglide/runtime'
import { ActivityTimeline } from '~/routes/admin/-components/activity-timeline'
import {
  SectionCard,
  SectionHeading
} from '~/routes/admin/-components/section-heading'
import { StatTiles } from '~/routes/admin/-components/stat-tiles'
import { buildActivityTiles } from '~/routes/admin/-helpers/activity'
import {
  getAdminUserActivityQueryOpts,
  getAdminUserDetailQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  AuthProviderBadge,
  SubscriptionBadge,
  UserStatusBadges
} from './-components/user-badges'
import { UserDetailActions } from './-components/user-detail-actions'
import { UserIpList } from './-components/user-ip-list'

const RouteComponent = () => {
  const { userId } = Route.useParams()
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const locale = getLocale()

  const detailQuery = useSuspenseQuery(getAdminUserDetailQueryOpts(userId))
  const activityQuery = useQuery(
    getAdminUserActivityQueryOpts({ userId, page })
  )

  const handlePageChange = (nextPage: number) => {
    void navigate({
      to: '/admin/users/$userId',
      params: { userId },
      search: { page: nextPage },
      viewTransition: false,
      replace: true
    })
  }

  return (
    <Container>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <UserAvatar
              name={detailQuery.data.user.name}
              image={detailQuery.data.user.image}
              className={cn(
                'size-10',
                detailQuery.data.user.banned === true
                  ? 'ring-2 ring-destructive'
                  : undefined
              )}
            />
            {detailQuery.data.user.name}
          </span>
        }
        description={
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              {detailQuery.data.user.email}
              {' · Inscrit le '}
              {formatDate(new Date(detailQuery.data.user.createdAt), locale)}
              {' · Dernière activité : '}
              {detailQuery.data.user.lastActiveAt
                ? formatDate(
                    new Date(detailQuery.data.user.lastActiveAt),
                    locale,
                    DATE_WITH_TIME_OPTIONS
                  )
                : 'jamais'}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <AuthProviderBadge provider={detailQuery.data.provider} />
              <UserStatusBadges
                banned={detailQuery.data.user.banned}
                emailVerified={detailQuery.data.user.emailVerified}
              />
              {detailQuery.data.subscription.status === 'none' ? (
                <Badge variant="outline" size="sm">
                  Gratuit
                </Badge>
              ) : (
                <SubscriptionBadge
                  isActive={detailQuery.data.subscription.status === 'active'}
                  startedAt={detailQuery.data.subscription.startedAt}
                  endsAt={detailQuery.data.subscription.endsAt}
                />
              )}
            </div>
          </div>
        }
        action={<UserDetailActions user={detailQuery.data.user} />}
      />
      <div className="flex flex-col gap-6 py-10">
        <section aria-label="Totaux d'activité">
          <SectionHeading
            title={`Activité — ${ACTIVITY_RETENTION_DAYS} derniers jours`}
          />
          <StatTiles
            tiles={buildActivityTiles(detailQuery.data.summary.totals)}
          />
        </section>
        <SectionCard
          title="Dernières IP connues"
          action={
            <span className="text-xs text-muted-foreground">
              Purgées après {ACTIVITY_IP_RETENTION_DAYS} jours
            </span>
          }
        >
          <UserIpList ipAddresses={detailQuery.data.ipAddresses} />
        </SectionCard>
        <section aria-label="Journal d'activité">
          <SectionHeading title="Journal d'activité" />
          <ActivityTimeline
            rows={activityQuery.data}
            total={detailQuery.data.summary.total}
            page={page}
            onPageChange={handlePageChange}
            caption={`Activité de ${detailQuery.data.user.name}`}
            isPending={activityQuery.isPending}
            isError={activityQuery.isError}
            error={activityQuery.error}
            scope="user"
          />
        </section>
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/users/$userId')({
  component: RouteComponent,
  validateSearch: ACTIVITY_PAGE_SCHEMA,
  loader: async ({ params, context }) => {
    const detail = await context.queryClient.ensureQueryData(
      getAdminUserDetailQueryOpts(params.userId)
    )

    return { crumb: detail.user.name }
  },
  head: ({ loaderData }) => {
    return {
      meta: [
        { title: `Admin Petit Meme - ${loaderData?.crumb ?? 'Utilisateur'}` }
      ]
    }
  }
})
