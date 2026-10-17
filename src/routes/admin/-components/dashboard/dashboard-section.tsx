import React from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { captureWithFeature } from '~/lib/sentry'

type SectionErrorFallbackProps = Pick<FallbackProps, 'resetErrorBoundary'>

const SectionErrorFallback = ({
  resetErrorBoundary
}: SectionErrorFallbackProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6">
      <TriangleAlert className="size-5 text-muted-foreground" aria-hidden />
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

const handleSectionError = (error: unknown) => {
  captureWithFeature(error, 'admin-dashboard')
}

type DashboardSectionProps = {
  fallback: React.ReactNode
  children: React.ReactNode
}

export const DashboardSection = ({
  fallback,
  children
}: DashboardSectionProps) => {
  return (
    <ErrorBoundary
      FallbackComponent={SectionErrorFallback}
      onError={handleSectionError}
    >
      <React.Suspense fallback={fallback}>{children}</React.Suspense>
    </ErrorBoundary>
  )
}
