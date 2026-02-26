import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Clapperboard, Clipboard, Download, Share2, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { VideoOverlay } from '@/components/Meme/video-overlay'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  VideoPlayer,
  VideoPlayerContent
} from '@/components/ui/kibo-ui/video-player'
import type { MemeWithVideo } from '@/constants/meme'
import { useDownloadMeme } from '@/hooks/use-download-meme'
import { useMemeHls } from '@/hooks/use-meme-hls'
import { useRegisterMemeView } from '@/hooks/use-register-meme-view'
import { useShareMeme } from '@/hooks/use-share-meme'
import type { ConversionEventName } from '@/lib/algolia-insights'
import { sendConversionEvent } from '@/lib/algolia-insights'
import { buildVideoImageUrl } from '@/lib/bunny'
import { buildUrl } from '@/lib/seo'
import { trackMemeAction } from '@/server/meme'
import { FocusScope } from '@radix-ui/react-focus-scope'
import { Link, useLinkProps } from '@tanstack/react-router'

type PlayerDialogParams = {
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
}: PlayerDialogParams) => {
  const { videoRef } = useMemeHls({ bunnyId: meme.video.bunnyId })
  const isReducedMotion = useReducedMotion()
  const shareMutation = useShareMeme()
  const downloadMutation = useDownloadMeme()
  const memeLink = useLinkProps({
    to: '/memes/$memeId',
    params: { memeId: meme.id }
  })

  useRegisterMemeView({
    memeId: meme.id,
    videoRef,
    ratio: 0.3,
    minMs: 2500,
    maxMs: 12000
  })

  const handleTrackConversion = (eventName: ConversionEventName) => {
    sendConversionEvent({
      queryID,
      objectID: meme.id,
      eventName,
      authenticatedUserToken
    })
  }

  const handleCopyMemeLink = async () => {
    const text = buildUrl(memeLink.href as string)

    try {
      await navigator.clipboard.writeText(text)
      void trackMemeAction({ data: { memeId: meme.id, action: 'share' } })
      toast.success('Lien copié', {
        position: 'bottom-center'
      })
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  const handleClose = () => {
    videoRef.current?.pause()
    onClose()
  }

  useHotkeys('escape', () => {
    return handleClose()
  })

  const handlePlayVideo = () => {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.play().catch(() => {
      video.addEventListener(
        'canplay',
        () => {
          video.play().catch(() => {})
        },
        { once: true }
      )
    })
  }

  const handleStudioClick = () => {
    handleTrackConversion('Meme Studio Opened')
    videoRef.current?.pause()
  }

  const handleShareClick = () => {
    handleTrackConversion('Meme Shared')
    shareMutation.mutate(meme)
  }

  const handleCopyClick = () => {
    handleTrackConversion('Meme Link Copied')
    void handleCopyMemeLink()
  }

  const handleDownloadClick = () => {
    handleTrackConversion('Meme Downloaded')
    downloadMutation.mutate(meme)
  }

  return (
    <FocusScope trapped loop>
      <div
        className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden dark"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-dialog-title"
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
          <Button size="icon" onClick={handleClose} aria-label="Fermer">
            <X />
          </Button>
        </motion.div>
        <motion.div
          layoutId={`${layoutContext}-item-${meme.id}`}
          onLayoutAnimationComplete={handlePlayVideo}
          className="relative w-200 max-w-[90vw]"
        >
          <div className="size-full flex flex-col items-center gap-y-4">
            <h3
              id="player-dialog-title"
              className="text-center w-full text-balance text-lg font-bold text-primary"
            >
              {meme.title}
            </h3>
            <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10 z-1">
              <VideoPlayer className="overflow-hidden size-full max-h-full">
                <VideoPlayerContent
                  crossOrigin=""
                  poster={buildVideoImageUrl(meme.video.bunnyId)}
                  className="size-full"
                  playsInline
                  disablePictureInPicture
                  disableRemotePlayback
                  preload="auto"
                  slot="media"
                  ref={videoRef}
                />
                <VideoOverlay showRemainingTime />
              </VideoPlayer>
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
                Ouvrir dans Studio
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
                  Partager la vidéo
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  onClick={handleCopyClick}
                >
                  <Clipboard />
                  Copier le lien
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={downloadMutation.isPending}
                  className="col-span-2 md:col-span-1 w-full"
                  onClick={handleDownloadClick}
                >
                  <Download />
                  Télécharger la vidéo
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </FocusScope>
  )
}
