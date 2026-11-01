import {
  CircleCheckBig,
  LoaderCircle,
  RefreshCw,
  TriangleAlert
} from 'lucide-react'
import { Progress } from '~/components/animate-ui/base/progress'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeFilesEngine, MemeFilesStep } from './use-meme-files-engine'

const MEME_FILES_STEP_LABELS = {
  preparing: 'Préparation de la vidéo...',
  watermarking: 'Watermark du MP4...',
  'extracting-mp3': 'Extraction du MP3...',
  uploading: 'Upload sur Bunny...'
} as const satisfies Record<MemeFilesStep, string>

type MemeFileBadgeProps = {
  format: MemeDerivedFormat
  missingFiles: MemeDerivedFormat[] | undefined
}

const MemeFileBadge = ({ format, missingFiles }: MemeFileBadgeProps) => {
  const label = format.toUpperCase()

  if (!missingFiles) {
    return (
      <Badge variant="secondary">
        <LoaderCircle className="animate-spin" aria-hidden />
        {label}
      </Badge>
    )
  }

  if (missingFiles.includes(format)) {
    return (
      <Badge variant="warning">
        <TriangleAlert aria-hidden />
        {label} manquant
      </Badge>
    )
  }

  return (
    <Badge variant="default">
      <CircleCheckBig aria-hidden />
      {label} prêt
    </Badge>
  )
}

type MemeFilesSectionProps = {
  engine: MemeFilesEngine
  isPublished: boolean
}

export const MemeFilesSection = ({
  engine,
  isPublished
}: MemeFilesSectionProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="text-sm font-medium">Fichiers</span>
          {MEME_DERIVED_FORMATS.map((format) => {
            return (
              <MemeFileBadge
                key={format}
                format={format}
                missingFiles={engine.missingFiles}
              />
            )
          })}
        </div>
        {isPublished ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={engine.isGenerating || engine.isChecking}
            aria-busy={engine.isGenerating}
            onClick={() => {
              engine.generate()
            }}
          >
            {engine.isGenerating ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw aria-hidden />
            )}
            Régénérer
          </Button>
        ) : null}
      </div>
      {engine.step ? (
        <output className="flex flex-col gap-1.5" aria-live="polite">
          <Progress
            value={engine.progress}
            aria-label={MEME_FILES_STEP_LABELS[engine.step]}
          />
          <span className="text-xs text-muted-foreground">
            {MEME_FILES_STEP_LABELS[engine.step]}
            {engine.progress === null ? null : ` ${engine.progress}%`}
          </span>
        </output>
      ) : null}
    </div>
  )
}
