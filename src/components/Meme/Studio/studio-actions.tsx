import { Download, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import type { ProcessedData } from '@/hooks/use-video-processor'
import { downloadBlob, shareBlob } from '@/utils/download'

type StudioCompactActionsParams = {
  processedData: ProcessedData
}

export const StudioCompactActions = ({
  processedData
}: StudioCompactActionsParams) => {
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 size-9"
        onClick={() => {
          void shareBlob(processedData.blob, processedData.title)
        }}
        aria-label="Partager"
      >
        <Share2 className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 size-9"
        onClick={() => {
          downloadBlob(processedData.blob, `${processedData.title}.mp4`)
        }}
        aria-label="Télécharger"
      >
        <Download className="size-4" />
      </Button>
    </>
  )
}

type StudioActionsParams = {
  isProcessing: boolean
  processedData: ProcessedData | null
  hasText: boolean
  onGenerate: () => void
}

export const StudioActions = ({
  isProcessing,
  processedData,
  hasText,
  onGenerate
}: StudioActionsParams) => {
  return (
    <div className="flex flex-col gap-2.5">
      <LoadingButton
        isLoading={isProcessing}
        onClick={onGenerate}
        disabled={!hasText}
      >
        <Sparkles />
        Générer la vidéo
      </LoadingButton>
      <Button
        variant="outline"
        disabled={processedData === null}
        className="md:hidden"
        onClick={() => {
          if (processedData !== null) {
            void shareBlob(processedData.blob, processedData.title)
          }
        }}
      >
        <Share2 />
        Partager la vidéo
      </Button>
      <Button
        variant="outline"
        disabled={processedData === null}
        onClick={() => {
          if (processedData !== null) {
            downloadBlob(processedData.blob, `${processedData.title}.mp4`)
          }
        }}
      >
        <Download />
        Télécharger la vidéo
      </Button>
      <p className="text-muted-foreground text-xs">
        Tout se fait directement sur ton appareil. Rien n'est envoyé ni stocké
        sur nos serveurs — tes fichiers restent privés.
      </p>
    </div>
  )
}
