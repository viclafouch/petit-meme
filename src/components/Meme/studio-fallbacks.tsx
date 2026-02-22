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

const matchIsCrossOriginError = (error: unknown) => {
  return error instanceof Error && error.message.includes('crossOriginIsolated')
}

export const StudioErrorFallback = ({
  error,
  resetErrorBoundary
}: FallbackProps) => {
  return (
    <div
      role="alert"
      className="animate-in fade-in fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm rounded-lg bg-background p-6 text-center shadow-lg flex flex-col gap-4">
        {matchIsCrossOriginError(error) ? (
          <>
            <p className="text-base font-semibold">
              Le Studio n'est pas disponible
            </p>
            <ul className="text-sm text-muted-foreground text-left flex flex-col gap-2">
              <li>Votre navigateur est trop ancien → Mettez-le à jour</li>
              <li>
                Un bloqueur de publicités interfère → Désactivez-le sur ce site
              </li>
              <li>Vous êtes en navigation privée → Essayez en mode normal</li>
            </ul>
          </>
        ) : (
          <p className="text-sm">Le moteur vidéo n'a pas pu être chargé.</p>
        )}
        <Button variant="secondary" size="sm" onClick={resetErrorBoundary}>
          Réessayer
        </Button>
      </div>
    </div>
  )
}
