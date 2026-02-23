import { Download, Share2, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import type { ProcessedData } from '@/hooks/use-video-processor'
import { downloadBlob, shareBlob } from '@/utils/download'

type StudioMobileActionsParams = {
  processedData: ProcessedData
}

export const StudioMobileActions = ({
  processedData
}: StudioMobileActionsParams) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      // eslint-disable-next-line id-length -- motion API requires single-letter axis properties (y)
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      // eslint-disable-next-line id-length -- motion API requires single-letter axis properties (y)
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex gap-2.5 px-3 py-3 md:hidden"
    >
      <Button
        className="flex-1"
        onClick={() => {
          void shareBlob(processedData.blob, processedData.title)
        }}
      >
        <Share2 />
        Partager
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          downloadBlob(processedData.blob, `${processedData.title}.mp4`)
        }}
      >
        <Download />
        Télécharger
      </Button>
    </motion.div>
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
    <div className="flex flex-col gap-2">
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
