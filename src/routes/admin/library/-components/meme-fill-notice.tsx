import {
  CircleCheckBig,
  LoaderCircle,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
  TriangleAlert
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import type { MemeFill } from './use-meme-fill'

type FillStatusRowProps = {
  memeFill: MemeFill
  onReview: () => void
}

const FillStatusRow = ({ memeFill, onReview }: FillStatusRowProps) => {
  const { fill, isStalled, start } = memeFill

  if (isStalled || fill.status === MemeFillStatus.FAILED) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" size="md">
          <TriangleAlert aria-hidden />
          AI Assist a échoué
        </Badge>
        <LoadingButton
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          isLoading={start.isPending}
          loadingText="Lancement..."
          onClick={() => {
            start.mutate('')
          }}
        >
          <RefreshCw aria-hidden />
          Réessayer
        </LoadingButton>
      </div>
    )
  }

  if (fill.status === MemeFillStatus.WAITING) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" size="md">
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden />
          En attente de la vidéo
        </Badge>
        <p className="text-sm text-muted-foreground">
          L’IA remplit la fiche dès que Bunny a fini la vidéo.
        </p>
      </div>
    )
  }

  if (fill.status === MemeFillStatus.RUNNING) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" size="md">
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden />
          Analyse en cours
        </Badge>
        <p className="text-sm text-muted-foreground">
          Vous pouvez quitter la page, le résultat vous attendra.
        </p>
      </div>
    )
  }

  if (fill.status === MemeFillStatus.FILLED && fill.suggestion) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" size="md">
          <Sparkles aria-hidden />
          Proposition prête
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={onReview}
        >
          Relire la proposition
        </Button>
      </div>
    )
  }

  return (
    <Badge variant="success" size="md">
      <CircleCheckBig aria-hidden />
      Rempli par l’IA
    </Badge>
  )
}

type MemeFillNoticeProps = FillStatusRowProps

export const MemeFillNotice = ({ memeFill, onReview }: MemeFillNoticeProps) => {
  const { fill } = memeFill
  const hasDoubt = fill.status === MemeFillStatus.FILLED && fill.doubt !== ''

  return (
    <div aria-live="polite" className="flex flex-col gap-3">
      <FillStatusRow memeFill={memeFill} onReview={onReview} />
      {hasDoubt ? (
        <Alert variant="warning">
          <MessageCircleQuestion aria-hidden />
          <AlertTitle>Doute de l’IA</AlertTitle>
          <AlertDescription>{fill.doubt}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
