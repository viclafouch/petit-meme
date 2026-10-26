import React from 'react'
import { Clapperboard, Clipboard, Download, Share2, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Dialog } from '@base-ui/react/dialog'
import { Link, useLinkProps } from '@tanstack/react-router'
import { MemeVideoPlayer } from '~/components/Meme/meme-video-player'
import { Button, buttonVariants } from '~/components/ui/button'
import type { MemeWithVideo } from '~/constants/meme'
import { useMemeExport } from '~/hooks/use-meme-export'
import { useMemeHls } from '~/hooks/use-meme-hls'
import { useRegisterMemeView } from '~/hooks/use-register-meme-view'
import { useVideoPlayback } from '~/hooks/use-video-playback'
import {
  sendConversionEvent,
  type ConversionEventName
} from '~/lib/algolia-insights'
import { buildVideoImageUrl } from '~/lib/bunny'
import { buildUrl } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { trackMemeAction } from '~/server/meme'

type PlayerDialogProps = {
  meme: MemeWithVideo
  layoutContext: string
  onClose: () => void
  queryID?: string
  authenticatedUserToken?: string
}

export const PlayerDialog = ({
  meme,
  layoutContext,
  onClose,
  queryID,
  authenticatedUserToken
}: PlayerDialogProps) => {
  const { video, videoCallbackRef, playbackFailure } = useMemeHls({
    bunnyId: meme.video.bunnyId
  })
  const isReducedMotion = useReducedMotion()
  const shareMutation = useMemeExport({ mode: 'share' })
  const downloadMutation = useMemeExport({ mode: 'download' })
  const memeLink = useLinkProps({
    to: '/memes/$memeId',
    params: { memeId: meme.id }
  })

  const [isPlaybackRequested, setIsPlaybackRequested] = React.useState(false)

  useVideoPlayback({
    video,
    shouldPlay: isPlaybackRequested && playbackFailure === null
  })

  useRegisterMemeView({
    memeId: meme.id,
    video,
    ratio: 0.3,
    minMs: 2500,
    maxMs: 12_000
  })

  const pauseVideo = () => {
    setIsPlaybackRequested(false)
    video?.pause()
  }

  const handleTrackConversion = (eventName: ConversionEventName) => {
    sendConversionEvent({
      queryID,
      objectID: meme.id,
      eventName,
      authenticatedUserToken
    })
  }

  const handleCopyMemeLink = async () => {
    if (memeLink.href === undefined) {
      return
    }

    const text = buildUrl(memeLink.href)

    try {
      await navigator.clipboard.writeText(text)
      void trackMemeAction({ data: { memeId: meme.id, action: 'share' } })
      toast.success(m.meme_link_copied(), {
        position: 'bottom-center'
      })
    } catch {
      toast.error(m.meme_link_copy_error())
    }
  }

  const handleClose = () => {
    pauseVideo()
    onClose()
  }

  const handlePlayVideo = () => {
    setIsPlaybackRequested(true)
  }

  const handleStudioClick = () => {
    pauseVideo()
    handleTrackConversion('Meme Studio Opened')
  }

  const handleShareClick = () => {
    pauseVideo()
    handleTrackConversion('Meme Shared')
    shareMutation.trigger(meme)
  }

  const handleCopyClick = () => {
    pauseVideo()
    handleTrackConversion('Meme Link Copied')
    void handleCopyMemeLink()
  }

  const handleDownloadClick = () => {
    pauseVideo()
    handleTrackConversion('Meme Downloaded')
    downloadMutation.trigger(meme)
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          handleClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup
          finalFocus={false}
          className="fixed inset-0 flex size-full items-center justify-center z-50 overflow-hidden bg-transparent text-inherit outline-none dark"
        >
          <motion.div
            initial={isReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            role="presentation"
            className="bg-black/90 absolute inset-0"
          />
          <motion.div
            className="absolute top-4 right-4"
            animate={{ opacity: 1 }}
            initial={isReducedMotion ? false : { opacity: 0 }}
            exit={{ opacity: 0 }}
          >
            <Button
              size="icon"
              onClick={handleClose}
              aria-label={m.common_close()}
            >
              <X />
            </Button>
          </motion.div>
          <motion.div
            layoutId={`${layoutContext}-item-${meme.id}`}
            onLayoutAnimationComplete={handlePlayVideo}
            className="relative w-200 max-w-vw-90"
          >
            <div className="size-full flex flex-col items-center gap-y-4">
              <Dialog.Title className="text-center w-full text-balance text-lg font-bold text-primary">
                {meme.title}
              </Dialog.Title>
              <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10 z-1">
                <MemeVideoPlayer
                  ref={videoCallbackRef}
                  poster={buildVideoImageUrl(meme.video.bunnyId)}
                  showRemainingTime
                  playbackFailure={playbackFailure}
                />
              </div>
              <div
                className="absolute bg-transparent inset-0 -z-1"
                onClick={handleClose}
                role="presentation"
              />
              <div className="w-full flex sm:justify-center gap-2 flex-col sm:max-w-sm">
                <Link
                  to="/memes/$memeId/studio"
                  params={{ memeId: meme.id }}
                  className={buttonVariants({ variant: 'default', size: 'lg' })}
                  onClick={handleStudioClick}
                >
                  <Clapperboard />
                  {m.meme_open_studio()}
                </Link>
                <div className="grid gap-2 grid-cols-2">
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={shareMutation.isPending}
                    className="md:hidden w-full"
                    onClick={handleShareClick}
                  >
                    <Share2 />
                    {m.meme_share_video()}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full"
                    onClick={handleCopyClick}
                  >
                    <Clipboard />
                    {m.meme_copy_link()}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={downloadMutation.isPending}
                    className="col-span-2 md:col-span-1 w-full"
                    onClick={handleDownloadClick}
                  >
                    <Download />
                    {m.meme_download_video()}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
