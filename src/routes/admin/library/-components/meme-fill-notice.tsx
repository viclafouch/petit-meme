import {
  CircleCheckBig,
  LoaderCircle,
  MessageCircleQuestion,
  MoonStar,
  RefreshCw,
  Sparkles,
  TriangleAlert
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import type { FillNotice } from '~/routes/admin/library/-lib/meme-fill'
import type { MemeFill } from './use-meme-fill'

const NIGHT_NOTICE_COPY = {
  QUEUED_TONIGHT: {
    label: 'File de nuit',
    description: 'La vidéo est prête, l’IA remplit la fiche au passage de nuit.'
  },
  RETRIED_TONIGHT: {
    label: 'Nouvel essai de nuit',
    description: 'Le dernier essai a échoué, l’IA réessaie au passage de nuit.'
  }
} as const satisfies Partial<
  Record<FillNotice, { label: string; description: string }>
>

type FillStatusRowProps = {
  memeFill: MemeFill
  onReview: () => void
}

const FillStatusRow = ({ memeFill, onReview }: FillStatusRowProps) => {
  const { notice, start } = memeFill

  if (notice === 'QUEUED_TONIGHT' || notice === 'RETRIED_TONIGHT') {
    const { label, description } = NIGHT_NOTICE_COPY[notice]

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" size="md">
          <MoonStar aria-hidden />
          {label}
        </Badge>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    )
  }

  if (notice === 'FAILED') {
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

  if (notice === 'WAITING_VIDEO') {
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

  if (notice === 'RUNNING') {
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

  if (notice === 'SUGGESTION_READY') {
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
