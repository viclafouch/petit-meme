import type { FallbackProps } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'
import { m } from '@/paraglide/messages.js'

export const StudioLoadingFallback = () => {
  return (
    <div
      aria-busy="true"
      className="animate-in fade-in h-dvh flex flex-col gap-3 items-center justify-center"
    >
      <LoadingSpinner className="size-8" />
      <p className="text-sm text-muted-foreground">{m.studio_loading()}</p>
    </div>
  )
}

export const StudioErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  return (
    <div
      role="alert"
      className="animate-in fade-in h-dvh flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm rounded-lg bg-muted p-6 text-center shadow-lg flex flex-col gap-4">
        <p className="text-sm">{m.studio_error()}</p>
        <Button variant="secondary" size="sm" onClick={resetErrorBoundary}>
          {m.studio_retry()}
        </Button>
      </div>
    </div>
  )
}
