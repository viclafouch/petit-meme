import {
  TriangleAlert,
  CircleCheckBig,
  Eye,
  LoaderCircle,
  RefreshCw,
  Upload
} from 'lucide-react'
import { Progress } from '~/components/animate-ui/base/progress'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import type { Meme } from '~/db/generated/prisma/client'
import { useMemeWatermark } from './use-meme-watermark'

type MemeWatermarkSectionProps = {
  memeId: Meme['id']
}

type WatermarkStatusBadgeProps = {
  isChecking: boolean
  watermarkExists: boolean
}

const WatermarkStatusBadge = ({
  isChecking,
  watermarkExists
}: WatermarkStatusBadgeProps) => {
  if (isChecking) {
    return (
      <Badge variant="secondary">
        <LoaderCircle className="animate-spin" aria-hidden />
        Vérification...
      </Badge>
    )
  }

  if (watermarkExists) {
    return (
      <Badge variant="default">
        <CircleCheckBig aria-hidden />
        Prêt
      </Badge>
    )
  }

  return (
    <Badge variant="warning">
      <TriangleAlert aria-hidden />
      Manquant
    </Badge>
  )
}

type GenerateButtonContentProps = {
  isGenerating: boolean
  watermarkExists: boolean
}

const GenerateButtonContent = ({
  isGenerating,
  watermarkExists
}: GenerateButtonContentProps) => {
  if (isGenerating) {
    return (
      <>
        <LoaderCircle className="animate-spin" aria-hidden />
        Génération...
      </>
    )
  }

  if (watermarkExists) {
    return (
      <>
        <RefreshCw aria-hidden />
        Régénérer
      </>
    )
  }

  return <>Générer le watermark</>
}

type WatermarkPreviewDialogProps = {
  previewUrl: string | null
  isGenerated: boolean
  isUploading: boolean
  onGenerate: () => void
  onUpload: () => void
  onDismiss: () => void
}

const WatermarkPreviewDialog = ({
  previewUrl,
  isGenerated,
  isUploading,
  onGenerate,
  onUpload,
  onDismiss
}: WatermarkPreviewDialogProps) => {
  return (
    <Dialog
      open={Boolean(previewUrl)}
      onOpenChange={(open) => {
        if (!open && !isUploading) {
          onDismiss()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Prévisualisation du watermark</DialogTitle>
          <DialogDescription>
            {isGenerated
              ? `Vérifiez le rendu avant d'uploader sur le CDN.`
              : 'Watermark actuellement uploadé sur le CDN.'}
          </DialogDescription>
        </DialogHeader>
        {previewUrl ? (
          <div className="overflow-hidden rounded-lg bg-black">
            <video
              src={previewUrl}
              controls
              className="mx-auto max-h-vh-70 w-auto"
              aria-label="Prévisualisation du watermark"
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {isGenerated ? (
            <Button
              type="button"
              className="w-full"
              disabled={isUploading}
              aria-busy={isUploading}
              onClick={() => {
                onUpload()
              }}
            >
              {isUploading ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden />
                  Upload...
                </>
              ) : (
                <>
                  <Upload aria-hidden />
                  Uploader
                </>
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isUploading}
            onClick={() => {
              onGenerate()
            }}
          >
            <RefreshCw aria-hidden />
            Régénérer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const MemeWatermarkSection = ({ memeId }: MemeWatermarkSectionProps) => {
  const {
    watermarkExists,
    isChecking,
    generate,
    upload,
    fetchExisting,
    isFetchingExisting,
    progress,
    isGenerating,
    isUploading,
    previewUrl,
    isPreviewGenerated,
    dismissPreview
  } = useMemeWatermark(memeId)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Watermark</span>
          <span aria-live="polite">
            <WatermarkStatusBadge
              isChecking={isChecking}
              watermarkExists={watermarkExists}
            />
          </span>
          {watermarkExists ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={isFetchingExisting}
              aria-label="Prévisualiser le watermark"
              onClick={() => {
                fetchExisting()
              }}
            >
              {isFetchingExisting ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Eye aria-hidden />
              )}
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant={watermarkExists ? 'outline' : 'default'}
          disabled={isGenerating || isChecking || isUploading}
          aria-busy={isGenerating}
          onClick={() => {
            generate()
          }}
        >
          <GenerateButtonContent
            isGenerating={isGenerating}
            watermarkExists={watermarkExists}
          />
        </Button>
      </div>
      {isGenerating ? (
        <output className="flex flex-col gap-1.5" aria-live="polite">
          <Progress value={progress} aria-label="Progression du watermark" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </output>
      ) : null}
      <WatermarkPreviewDialog
        previewUrl={previewUrl}
        isGenerated={isPreviewGenerated}
        isUploading={isUploading}
        onGenerate={generate}
        onUpload={upload}
        onDismiss={dismissPreview}
      />
    </div>
  )
}
