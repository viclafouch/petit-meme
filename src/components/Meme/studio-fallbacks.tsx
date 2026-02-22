import type { FallbackProps } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'

export const StudioLoadingFallback = () => {
  return (
    <div
      aria-busy="true"
      className="animate-in fade-in fixed inset-0 z-50 bg-black/50 flex flex-col gap-3 items-center justify-center"
    >
      <LoadingSpinner className="size-8" />
      <p className="text-sm text-white">Chargement du moteur vidéo…</p>
    </div>
  )
}

export const StudioErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  return (
    <div
      role="alert"
      className="animate-in fade-in fixed inset-0 z-50 bg-black/50 flex flex-col gap-3 items-center justify-center"
    >
      <p className="text-sm text-white">
        Le moteur vidéo n'a pas pu être chargé.
      </p>
      <Button variant="secondary" size="sm" onClick={resetErrorBoundary}>
        Réessayer
      </Button>
    </div>
  )
}
