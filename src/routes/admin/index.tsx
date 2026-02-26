import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAdminDashboardStatsQueryOpts,
  getAdminRecentActivityQueryOpts
} from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { type DashboardPeriod, PERIOD_SCHEMA } from '@/server/admin/dashboard'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ActivityFeed } from './-components/dashboard/activity-feed'
import { KpiGrid } from './-components/dashboard/kpi-grid'
import { PeriodSelector } from './-components/dashboard/period-selector'
import { QuickLinks } from './-components/dashboard/quick-links'
import { TotalsSection } from './-components/dashboard/totals-section'

const dashboardSearchSchema = z.object({
  period: PERIOD_SCHEMA.optional().default('30d').catch('30d')
})

type SectionErrorFallbackParams = {
  resetErrorBoundary: () => void
}

const SectionErrorFallback = ({
  resetErrorBoundary
}: SectionErrorFallbackParams) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6">
      <AlertTriangle className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Impossible de charger les données
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        <RefreshCw className="size-3" />
        Réessayer
      </Button>
    </div>
  )
}

const KpiSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 7 }).map((_, index) => {
        return (
          <div
            key={index}
            className="rounded-xl border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        )
      })}
    </div>
  )
}

const TotalsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => {
        return (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const QuickLinksSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => {
        return (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        )
      })}
    </div>
  )
}

const FeedSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => {
        return (
          <div key={index} className="flex items-start gap-3">
            <Skeleton className="size-7 rounded-md" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

type StatsContentParams = {
  period: DashboardPeriod
}

const StatsContent = ({ period }: StatsContentParams) => {
  const statsQuery = useSuspenseQuery({
    ...getAdminDashboardStatsQueryOpts(period),
    refetchOnMount: 'always'
  })

  return (
    <>
      <section aria-label="Indicateurs clés">
        <KpiGrid kpis={statsQuery.data.kpis} />
      </section>
      <section aria-label="Totaux">
        <TotalsSection totals={statsQuery.data.totals} />
      </section>
      <section aria-label="Liens rapides">
        <QuickLinks totals={statsQuery.data.totals} />
      </section>
    </>
  )
}

const FeedContent = () => {
  const feedQuery = useSuspenseQuery({
    ...getAdminRecentActivityQueryOpts(),
    refetchOnMount: 'always'
  })

  return <ActivityFeed entries={feedQuery.data} />
}

const handleSectionError = (error: unknown) => {
  captureWithFeature(error, 'admin-dashboard')
}

const RouteComponent = () => {
  const { period } = Route.useSearch()

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Dashboard"
        action={<PeriodSelector period={period} />}
      />
      <ErrorBoundary
        FallbackComponent={SectionErrorFallback}
        onError={handleSectionError}
      >
        <React.Suspense
          fallback={
            <div className="flex flex-col gap-6">
              <KpiSkeleton />
              <TotalsSkeleton />
              <QuickLinksSkeleton />
            </div>
          }
        >
          <StatsContent period={period} />
        </React.Suspense>
      </ErrorBoundary>
      <section aria-label="Activité récente">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Activité récente
        </h2>
        <div className="rounded-xl border bg-card p-4">
          <ErrorBoundary
            FallbackComponent={SectionErrorFallback}
            onError={handleSectionError}
          >
            <React.Suspense fallback={<FeedSkeleton />}>
              <FeedContent />
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/admin/')({
  component: RouteComponent,
  validateSearch: dashboardSearchSchema,
  head: () => {
    return {
      meta: [{ title: 'Dashboard — Admin' }]
    }
  }
})
