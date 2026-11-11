import { Download, Share2, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import type { ProcessedData } from '~/components/studio/use-video-processor'
import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'
import type { MemeExportMode } from '~/constants/meme'
import { EASE_OUT } from '~/constants/motion'
import { shareOrDownloadBlob } from '~/lib/meme-export'
import { m } from '~/paraglide/messages.js'

const deliverStudioVideo = (
  { blob, title }: ProcessedData,
  mode: MemeExportMode
) => {
  void shareOrDownloadBlob({ blob, title, mode, format: 'mp4' })
}

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
          deliverStudioVideo(processedData, 'share')
        }}
      >
        <Share2 />
        {m.meme_share()}
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          deliverStudioVideo(processedData, 'download')
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

    deliverStudioVideo(processedData, 'share')
  }

  const handleDownloadClick = () => {
    if (processedData === null) {
      toast.error(m.studio_generate_first())

      return
    }

    deliverStudioVideo(processedData, 'download')
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
