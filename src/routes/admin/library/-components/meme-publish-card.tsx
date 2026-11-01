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
import type { MemePublisher } from './use-meme-publisher'

const RUNNING_LABELS = {
  publish: 'Publication...',
  regenerate: 'Régénération...'
} as const satisfies Record<PublishRunKind, string>

type FileBadgeProps = {
  format: MemeDerivedFormat
  missingFiles: MemeDerivedFormat[] | undefined
}

const FileBadge = ({ format, missingFiles }: FileBadgeProps) => {
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

type MemePublishCardProps = {
  index: number
  meme: MemeFullData
  publisher: MemePublisher
  onPublish: () => void
  className?: string
}

export const MemePublishCard = ({
  index,
  meme,
  publisher,
  onPublish,
  className
}: MemePublishCardProps) => {
  const { run, isRunning, missingFiles } = publisher
  const isPublished = meme.status === MemeStatus.PUBLISHED

  const handleRegenerate = () => {
    void publisher.regenerate()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <MemeSectionTitle index={index}>Publication</MemeSectionTitle>
        <CardDescription>
          {isPublished
            ? 'En ligne. Chaque modification part sur le site toute seule.'
            : 'Le navigateur génère le MP4 watermarké et le MP3, puis met le Meme en ligne.'}
        </CardDescription>
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
              disabled={isRunning || !missingFiles}
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
      {isPublished ? null : (
        <CardFooter>
          <LoadingButton
            type="button"
            size="lg"
            className="w-full"
            isLoading={isRunning}
            loadingText={run ? RUNNING_LABELS[run.kind] : undefined}
            onClick={onPublish}
          >
            Publier
          </LoadingButton>
        </CardFooter>
      )}
    </Card>
  )
}
