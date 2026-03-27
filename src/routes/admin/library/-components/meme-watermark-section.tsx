import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Loader2,
  RefreshCw,
  Upload
} from 'lucide-react'
import { Progress } from '~/components/animate-ui/radix/progress'
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

type MemeWatermarkSectionParams = {
  memeId: Meme['id']
}

type WatermarkStatusBadgeParams = {
  isChecking: boolean
  watermarkExists: boolean
}

const WatermarkStatusBadge = ({
  isChecking,
  watermarkExists
}: WatermarkStatusBadgeParams) => {
  if (isChecking) {
    return (
      <Badge variant="secondary">
        <Loader2 className="animate-spin" aria-hidden />
        Vérification...
      </Badge>
    )
  }

  if (watermarkExists) {
    return (
      <Badge variant="default">
        <CheckCircle aria-hidden />
        Prêt
      </Badge>
    )
  }

  return (
    <Badge variant="warning">
      <AlertTriangle aria-hidden />
      Manquant
    </Badge>
  )
}

type GenerateButtonContentParams = {
  isGenerating: boolean
  watermarkExists: boolean
}

const GenerateButtonContent = ({
  isGenerating,
  watermarkExists
}: GenerateButtonContentParams) => {
  if (isGenerating) {
    return (
      <>
        <Loader2 className="animate-spin" aria-hidden />
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

type WatermarkPreviewDialogParams = {
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
}: WatermarkPreviewDialogParams) => {
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
              className="mx-auto max-h-[70vh] w-auto"
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
                return onUpload()
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
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
              return onGenerate()
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

export const MemeWatermarkSection = ({
  memeId
}: MemeWatermarkSectionParams) => {
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
                return fetchExisting()
              }}
            >
              {isFetchingExisting ? (
                <Loader2 className="animate-spin" aria-hidden />
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
            return generate()
          }}
        >
          <GenerateButtonContent
            isGenerating={isGenerating}
            watermarkExists={watermarkExists}
          />
        </Button>
      </div>
      {isGenerating ? (
        <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
          <Progress value={progress} aria-label="Progression du watermark" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
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
