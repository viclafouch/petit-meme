import { Download, Share2, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'
import { EASE_OUT } from '~/constants/motion'
import type { ProcessedData } from '~/hooks/use-video-processor'
import { m } from '~/paraglide/messages.js'
import { downloadBlob, shareBlob } from '~/utils/download'

type StudioMobileActionsProps = {
  processedData: ProcessedData
}

export const StudioMobileActions = ({
  processedData
}: StudioMobileActionsProps) => {
  const isReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={isReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex gap-2.5"
    >
      <Button
        className="flex-1"
        onClick={() => {
          void shareBlob(processedData.blob, processedData.title)
        }}
      >
        <Share2 />
        {m.meme_share()}
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          downloadBlob(processedData.blob, `${processedData.title}.mp4`)
        }}
      >
        <Download />
        {m.meme_download()}
      </Button>
    </motion.div>
  )
}

type StudioActionsProps = {
  isProcessing: boolean
  processedData: ProcessedData | null
  onGenerate: () => void
}

export const StudioActions = ({
  isProcessing,
  processedData,
  onGenerate
}: StudioActionsProps) => {
  const handleShareClick = () => {
    if (processedData === null) {
      toast.error(m.studio_generate_first())

      return
    }

    void shareBlob(processedData.blob, processedData.title)
  }

  const handleDownloadClick = () => {
    if (processedData === null) {
      toast.error(m.studio_generate_first())

      return
    }

    downloadBlob(processedData.blob, `${processedData.title}.mp4`)
  }

  return (
    <div className="flex flex-col gap-2">
      <LoadingButton isLoading={isProcessing} onClick={onGenerate}>
        <Sparkles />
        {m.studio_generate_video()}
      </LoadingButton>
      <Button
        variant="outline"
        className="md:hidden"
        onClick={handleShareClick}
      >
        <Share2 />
        {m.meme_share_video()}
      </Button>
      <Button variant="outline" onClick={handleDownloadClick}>
        <Download />
        {m.meme_download_video()}
      </Button>
      <p className="text-muted-foreground text-xs">
        {m.studio_privacy_notice()}
      </p>
    </div>
  )
}
