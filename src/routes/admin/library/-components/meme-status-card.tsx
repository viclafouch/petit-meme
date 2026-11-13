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
import { MEME_STORED_FILES, type MemeStoredFile } from '~/constants/bunny'
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

type FileBadgeLabels = {
  name: string
  missing: string
  ready: string
}

const FILE_BADGE_LABELS = {
  mp4: { name: 'MP4', missing: 'MP4 manquant', ready: 'MP4 prêt' },
  mp3: { name: 'MP3', missing: 'MP3 manquant', ready: 'MP3 prêt' },
  'first-frame': {
    name: 'Première frame',
    missing: 'Première frame manquante',
    ready: 'Première frame prête'
  }
} as const satisfies Record<MemeStoredFile, FileBadgeLabels>

type FileBadgeProps = {
  file: MemeStoredFile
  missingFiles: MemeStoredFile[] | undefined
}

export const FileBadge = ({ file, missingFiles }: FileBadgeProps) => {
  const labels = FILE_BADGE_LABELS[file]

  if (!missingFiles) {
    return (
      <Badge variant="secondary" size="md">
        <LoaderCircle className="animate-spin" aria-hidden />
        {labels.name}
      </Badge>
    )
  }

  if (missingFiles.includes(file)) {
    return (
      <Badge variant="warning" size="md">
        <TriangleAlert aria-hidden />
        {labels.missing}
      </Badge>
    )
  }

  return (
    <Badge variant="success" size="md">
      <CircleCheckBig aria-hidden />
      {labels.ready}
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
    publisher.regenerate()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <MemeSectionTitle index={index}>Statut</MemeSectionTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {MEME_STORED_FILES.map((file) => {
            return (
              <FileBadge key={file} file={file} missingFiles={missingFiles} />
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
            publisher.changeStatus(transition)
          }}
        >
          {transition.label}
        </LoadingButton>
      </CardFooter>
    </Card>
  )
}
