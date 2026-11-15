import React from 'react'
import { ChevronDown, Clapperboard, Download, Share2, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Dialog } from '@base-ui/react/dialog'
import { Link } from '@tanstack/react-router'
import { CopyMemeLinkButton } from '~/components/meme/copy-meme-link-button'
import { MemeExportMenu } from '~/components/meme/meme-export-menu'
import { MemeVideoPlayer } from '~/components/meme/meme-video-player'
import { useMediaSession } from '~/components/meme/use-media-session'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { useRegisterMemeView } from '~/components/meme/use-register-meme-view'
import { useVideoPlayback } from '~/components/meme/use-video-playback'
import { Button, buttonVariants } from '~/components/ui/button'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeWithVideo } from '~/constants/meme'
import {
  sendConversionEvent,
  type ConversionEventName
} from '~/lib/algolia-insights'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'

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
    memeId: meme.id
  })

  useMediaSession({
    video,
    isActive: true,
    meme
  })
  const isReducedMotion = useReducedMotion()
  const shareMutation = useMemeExport({ mode: 'share', queryID })
  const downloadMutation = useMemeExport({ mode: 'download', queryID })

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

  const handleShare = (format: MemeDerivedFormat) => {
    pauseVideo()
    shareMutation.trigger(meme, format)
  }

  const handleCopy = () => {
    pauseVideo()
    handleTrackConversion('Meme Link Copied')
  }

  const handleDownload = (format: MemeDerivedFormat) => {
    pauseVideo()
    downloadMutation.trigger(meme, format)
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
          className="fixed inset-0 flex size-full items-center justify-center z-50 overflow-hidden bg-transparent text-foreground outline-none dark"
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
            className="absolute top-[max(--spacing(4),env(safe-area-inset-top))] right-[max(--spacing(4),env(safe-area-inset-right))]"
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
            className="relative w-200 max-w-[90%]"
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
                  <MemeExportMenu
                    mode="share"
                    memeTitle={meme.title}
                    onExport={handleShare}
                    render={
                      <Button
                        size="lg"
                        variant="secondary"
                        disabled={shareMutation.isPending}
                        className="pointer-fine:hidden w-full"
                      />
                    }
                  >
                    <Share2 />
                    {m.meme_share()}
                    <ChevronDown className="text-muted-foreground" />
                  </MemeExportMenu>
                  <CopyMemeLinkButton
                    memeId={meme.id}
                    size="lg"
                    variant="secondary"
                    className="w-full"
                    onCopy={handleCopy}
                  />
                  <MemeExportMenu
                    mode="download"
                    memeTitle={meme.title}
                    onExport={handleDownload}
                    render={
                      <Button
                        size="lg"
                        variant="secondary"
                        disabled={downloadMutation.isPending}
                        className="col-span-2 md:col-span-1 w-full"
                      />
                    }
                  >
                    <Download />
                    {m.meme_download()}
                    <ChevronDown className="text-muted-foreground" />
                  </MemeExportMenu>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
