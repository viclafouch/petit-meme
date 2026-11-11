import { ArrowRight } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { listAdminRecentActivityQueryOpts } from '~/queries/admin/activity'
import {
  getAdminDashboardChartQueryOpts,
  getAdminDashboardTotalsQueryOpts,
  listAdminRecentAuditQueryOpts,
  listAdminTrendingMemesQueryOpts
} from '~/queries/admin/dashboard'
import { PageHeader } from '~/routes/admin/-components/page-header'
import { SectionHeading } from '~/routes/admin/-components/section-heading'
import type { DashboardPeriod } from '~/server/admin/dashboard/dashboard.functions'
import { ActivityEventsFeed } from './activity-events-feed'
import { AuditFeed } from './audit-feed'
import { DashboardSection } from './dashboard-section'
import {
  ChartSkeleton,
  FeedSkeleton,
  SummarySkeleton,
  TotalsSkeleton,
  TrendingSkeleton
} from './dashboard-skeletons'
import { PeriodSelector } from './period-selector'
import { TotalsSection } from './totals-section'
import { TrendingMemes } from './trending-memes'
import { TrendsChart } from './trends-chart'

const routeApi = getRouteApi('/admin/')

type ChartContentProps = {
  period: DashboardPeriod
}

const ChartContent = ({ period }: ChartContentProps) => {
  const chartQuery = useSuspenseQuery(getAdminDashboardChartQueryOpts(period))

  return <TrendsChart data={chartQuery.data} period={period} />
}

const TotalsContent = () => {
  const totalsQuery = useSuspenseQuery(getAdminDashboardTotalsQueryOpts())

  return <TotalsSection totals={totalsQuery.data} />
}

const TrendingContent = () => {
  const trendingQuery = useSuspenseQuery(listAdminTrendingMemesQueryOpts())

  return <TrendingMemes entries={trendingQuery.data} />
}

const AuditContent = () => {
  const auditQuery = useSuspenseQuery(listAdminRecentAuditQueryOpts())

  return <AuditFeed entries={auditQuery.data} now={auditQuery.dataUpdatedAt} />
}

const ActivityContent = () => {
  const activityQuery = useSuspenseQuery(listAdminRecentActivityQueryOpts())

  return (
    <ActivityEventsFeed
      entries={activityQuery.data}
      now={activityQuery.dataUpdatedAt}
    />
  )
}

export const DashboardPage = () => {
  const { period } = routeApi.useSearch()

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Dashboard"
        action={<PeriodSelector period={period} />}
      />
      <DashboardSection
        fallback={
          <div className="flex flex-col gap-6">
            <ChartSkeleton />
            <SummarySkeleton />
          </div>
        }
      >
        <ChartContent period={period} />
      </DashboardSection>
      <DashboardSection fallback={<TotalsSkeleton />}>
        <TotalsContent />
      </DashboardSection>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-label="Memes tendances">
          <SectionHeading title="Tendances — 7 derniers jours" />
          <div className="rounded-xl border bg-card p-4">
            <DashboardSection fallback={<TrendingSkeleton />}>
              <TrendingContent />
            </DashboardSection>
          </div>
        </section>
        <section className="lg:col-span-2" aria-label="Activité récente">
          <SectionHeading
            title="Activité récente"
            action={
              <Link
                to="/admin/activity"
                className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Tout voir
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            }
          />
          <div className="rounded-xl border bg-card p-4">
            <DashboardSection fallback={<FeedSkeleton />}>
              <ActivityContent />
            </DashboardSection>
          </div>
        </section>
      </div>
      <section aria-label="Journal d'administration">
        <SectionHeading title="Journal d'administration" />
        <div className="rounded-xl border bg-card p-4">
          <DashboardSection fallback={<FeedSkeleton />}>
            <AuditContent />
          </DashboardSection>
        </div>
      </section>
    </div>
  )
}
