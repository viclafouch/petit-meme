import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import { UserAvatar } from '~/components/user/user-avatar'
import {
  ACTIVITY_IP_RETENTION_DAYS,
  ACTIVITY_RETENTION_DAYS
} from '~/constants/activity'
import { cn } from '~/lib/utils'
import {
  listAdminUserActivityQueryOpts,
  getAdminUserQueryOpts
} from '~/queries/admin/user'
import { ActivityTimeline } from '~/routes/admin/-components/activity-timeline'
import {
  SectionCard,
  SectionHeading
} from '~/routes/admin/-components/section-heading'
import { StatTiles } from '~/routes/admin/-components/stat-tiles'
import { buildActivityTiles } from '~/routes/admin/-lib/activity-tiles'
import { UserAccountPanel } from '~/routes/admin/users/-components/user-account-panel'
import {
  PremiumBadges,
  UserStatusBadges
} from '~/routes/admin/users/-components/user-badges'
import { UserIpList } from '~/routes/admin/users/-components/user-ip-list'
import { UserSubscriptionHistory } from '~/routes/admin/users/-components/user-subscription-history'
import type { AdminUser } from '~/server/admin/user/user.functions'

const routeApi = getRouteApi('/admin/users/$userId')

type UserIdentityProps = Pick<AdminUser, 'user' | 'subscription'>

const UserIdentity = ({ user, subscription }: UserIdentityProps) => {
  return (
    <header className="flex items-center gap-4">
      <UserAvatar
        name={user.name}
        image={user.image}
        email={user.email}
        size="xl"
        className={cn(
          'size-16 sm:size-20',
          user.banned === true
            ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background'
            : undefined
        )}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{user.name}</h1>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <div className="flex flex-wrap items-center gap-1">
          <UserStatusBadges
            banned={user.banned}
            emailVerified={user.emailVerified}
          />
          <PremiumBadges
            role={user.role}
            premiumGrantedAt={user.premiumGrantedAt}
            subscription={subscription}
            emptyFallback={
              <Badge variant="outline" size="sm">
                Gratuit
              </Badge>
            }
          />
        </div>
      </div>
    </header>
  )
}

export const UserPage = () => {
  const { userId } = routeApi.useParams()
  const { page } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const detailQuery = useSuspenseQuery(getAdminUserQueryOpts(userId))
  const activityQuery = useQuery(
    listAdminUserActivityQueryOpts({ userId, page })
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
      <div className="flex flex-col gap-10 pt-2 pb-12">
        <UserIdentity
          user={detailQuery.data.user}
          subscription={detailQuery.data.subscription}
        />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-detail-aside lg:items-start lg:gap-8">
          <div className="lg:col-start-2 lg:row-start-1">
            <UserAccountPanel
              user={detailQuery.data.user}
              provider={detailQuery.data.provider}
              subscription={detailQuery.data.subscription}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1">
            <section aria-label="Totaux d'activité">
              <SectionHeading
                title={`Activité des ${ACTIVITY_RETENTION_DAYS} derniers jours`}
              />
              <StatTiles
                tiles={buildActivityTiles(detailQuery.data.summary.totals)}
              />
            </section>
            <UserSubscriptionHistory userId={userId} />
            <SectionCard
              title="Dernières IP connues"
              action={
                <span className="text-xs text-muted-foreground">
                  Purgées après {ACTIVITY_IP_RETENTION_DAYS} jours
                </span>
              }
            >
              <UserIpList
                ipAddresses={detailQuery.data.ipAddresses}
                now={detailQuery.dataUpdatedAt}
              />
            </SectionCard>
          </div>
        </div>
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
            now={activityQuery.dataUpdatedAt}
            scope="user"
          />
        </section>
      </div>
    </Container>
  )
}
