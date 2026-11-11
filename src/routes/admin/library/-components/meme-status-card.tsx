import {
  CircleCheckBig,
  LoaderCircle,
  RefreshCw,
  TriangleAlert
} from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from '~/components/ui/card'
import { LoadingButton } from '~/components/ui/loading-button'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import type { PublishRunKind } from '~/routes/admin/library/-lib/publish-run'
import { MemePublishTimeline } from './meme-publish-timeline'
import { MemeSectionTitle } from './meme-section-title'
import type { MemePublisher, StatusTransition } from './use-meme-publisher'

type StatusCardContent = {
  description: string
  canPublish: boolean
  transition: StatusTransition
}

const REJECT_TRANSITION = {
  status: MemeStatus.REJECTED,
  label: 'Rejeter',
  successMessage: 'Meme rejeté'
} as const satisfies StatusTransition

const STATUS_CARD_CONTENT = {
  [MemeStatus.PENDING]: {
    description:
      'Caché du site. Publier génère le MP4 watermarké et le MP3 s’ils manquent, puis met le Meme en ligne.',
    canPublish: true,
    transition: REJECT_TRANSITION
  },
  [MemeStatus.PUBLISHED]: {
    description: 'En ligne. Chaque modification part sur le site toute seule.',
    canPublish: false,
    transition: {
      status: MemeStatus.ARCHIVED,
      label: 'Retirer du site',
      successMessage: 'Retiré du site'
    }
  },
  [MemeStatus.ARCHIVED]: {
    description:
      'Retiré du site, gardé dans la bibliothèque. Publier le remet en ligne.',
    canPublish: true,
    transition: REJECT_TRANSITION
  },
  [MemeStatus.REJECTED]: {
    description: 'Écarté, il ne sera pas publié.',
    canPublish: false,
    transition: {
      status: MemeStatus.PENDING,
      label: 'Remettre en attente',
      successMessage: 'Remis en attente'
    }
  }
} as const satisfies Record<MemeStatus, StatusCardContent>

const RUNNING_LABELS = {
  publish: 'Publication...',
  'publish-with-files': 'Publication...',
  regenerate: 'Régénération...'
} as const satisfies Record<PublishRunKind, string>

type FileBadgeProps = {
  format: MemeDerivedFormat
  missingFiles: MemeDerivedFormat[] | undefined
}

export const FileBadge = ({ format, missingFiles }: FileBadgeProps) => {
  const label = format.toUpperCase()

  if (!missingFiles) {
    return (
      <Badge variant="secondary" size="md">
        <LoaderCircle className="animate-spin" aria-hidden />
        {label}
      </Badge>
    )
  }

  if (missingFiles.includes(format)) {
    return (
      <Badge variant="warning" size="md">
        <TriangleAlert aria-hidden />
        {label} manquant
      </Badge>
    )
  }

  return (
    <Badge variant="success" size="md">
      <CircleCheckBig aria-hidden />
      {label} prêt
    </Badge>
  )
}

type MemeStatusCardProps = {
  index: number
  meme: MemeFullData
  publisher: MemePublisher
  onPublish: () => void
  className?: string
}

export const MemeStatusCard = ({
  index,
  meme,
  publisher,
  onPublish,
  className
}: MemeStatusCardProps) => {
  const { run, isRunning, isChangingStatus, missingFiles } = publisher
  const isPublished = meme.status === MemeStatus.PUBLISHED
  const { description, canPublish, transition } =
    STATUS_CARD_CONTENT[meme.status]
  const isBusy = isRunning || isChangingStatus

  const handleRegenerate = () => {
    void publisher.regenerate()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <MemeSectionTitle index={index}>Statut</MemeSectionTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {MEME_DERIVED_FORMATS.map((format) => {
            return (
              <FileBadge
                key={format}
                format={format}
                missingFiles={missingFiles}
              />
            )
          })}
          {isPublished ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto"
              disabled={isBusy || !missingFiles}
              onClick={handleRegenerate}
            >
              <RefreshCw data-icon="inline-start" aria-hidden />
              Régénérer
            </Button>
          ) : null}
        </div>
        {run ? (
          <MemePublishTimeline
            key={run.id}
            run={run}
            meme={meme}
            onRetry={run.kind === 'regenerate' ? handleRegenerate : onPublish}
          />
        ) : null}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {canPublish ? (
          <LoadingButton
            type="button"
            size="lg"
            className="w-full"
            isLoading={isRunning}
            loadingText={run ? RUNNING_LABELS[run.kind] : undefined}
            disabled={isChangingStatus || !missingFiles}
            onClick={onPublish}
          >
            Publier
          </LoadingButton>
        ) : null}
        <LoadingButton
          type="button"
          size="lg"
          variant={canPublish ? 'ghost' : 'outline'}
          className="w-full"
          isLoading={isChangingStatus}
          disabled={isRunning}
          onClick={() => {
            void publisher.changeStatus(transition)
          }}
        >
          {transition.label}
        </LoadingButton>
      </CardFooter>
    </Card>
  )
}
