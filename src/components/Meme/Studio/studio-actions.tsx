import { Download, Share2, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import type { ProcessedData } from '@/hooks/use-video-processor'
import { downloadBlob, shareBlob } from '@/utils/download'

const GENERATE_FIRST_MESSAGE = 'Génère d’abord une vidéo'

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
  onGenerate: () => void
}

export const StudioActions = ({
  isProcessing,
  processedData,
  onGenerate
}: StudioActionsParams) => {
  const handleShareClick = () => {
    if (processedData === null) {
      toast.error(GENERATE_FIRST_MESSAGE)

      return
    }

    void shareBlob(processedData.blob, processedData.title)
  }

  const handleDownloadClick = () => {
    if (processedData === null) {
      toast.error(GENERATE_FIRST_MESSAGE)

      return
    }

    downloadBlob(processedData.blob, `${processedData.title}.mp4`)
  }

  return (
    <div className="flex flex-col gap-2">
      <LoadingButton isLoading={isProcessing} onClick={onGenerate}>
        <Sparkles />
        Générer la vidéo
      </LoadingButton>
      <Button
        variant="outline"
        className="md:hidden"
        onClick={handleShareClick}
      >
        <Share2 />
        Partager la vidéo
      </Button>
      <Button variant="outline" onClick={handleDownloadClick}>
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
