import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAdminChartDataQueryOpts,
  getAdminDashboardTotalsQueryOpts,
  getAdminRecentActivityQueryOpts
} from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { type DashboardPeriod, PERIOD_SCHEMA } from '@/server/admin/dashboard'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ActivityFeed } from './-components/dashboard/activity-feed'
import { PeriodSelector } from './-components/dashboard/period-selector'
import { QuickLinks } from './-components/dashboard/quick-links'
import { TotalsSection } from './-components/dashboard/totals-section'
import { TrendsChart } from './-components/dashboard/trends-chart'

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

const SummarySkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => {
        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
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

const ChartSkeleton = () => {
  return (
    <Card>
      <div className="flex flex-col gap-2 px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex flex-col gap-4 px-6">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-62.5 w-full rounded-lg" />
      </div>
    </Card>
  )
}

type PeriodContentParams = {
  period: DashboardPeriod
}

const ChartContent = ({ period }: PeriodContentParams) => {
  const chartQuery = useSuspenseQuery({
    ...getAdminChartDataQueryOpts(period),
    refetchOnMount: 'always'
  })

  return <TrendsChart data={chartQuery.data} period={period} />
}

const TotalsContent = () => {
  const totalsQuery = useSuspenseQuery({
    ...getAdminDashboardTotalsQueryOpts(),
    refetchOnMount: 'always'
  })

  return (
    <>
      <section aria-label="Totaux">
        <TotalsSection totals={totalsQuery.data} />
      </section>
      <section aria-label="Liens rapides">
        <QuickLinks totals={totalsQuery.data} />
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
              <ChartSkeleton />
              <SummarySkeleton />
            </div>
          }
        >
          <ChartContent period={period} />
        </React.Suspense>
      </ErrorBoundary>
      <ErrorBoundary
        FallbackComponent={SectionErrorFallback}
        onError={handleSectionError}
      >
        <React.Suspense
          fallback={
            <div className="flex flex-col gap-6">
              <TotalsSkeleton />
              <QuickLinksSkeleton />
            </div>
          }
        >
          <TotalsContent />
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
