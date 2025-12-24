import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { Clapperboard, Clipboard, Download, Share2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange
} from '@/components/ui/kibo-ui/video-player'
import type { MemeWithVideo } from '@/constants/meme'
import { useDownloadMeme } from '@/hooks/use-download-meme'
import { useRegisterMemeView } from '@/hooks/use-register-meme-view'
import { useShareMeme } from '@/hooks/use-share-meme'
import { buildVideoImageUrl, buildVideoStreamUrl } from '@/lib/bunny'
import { buildUrl } from '@/lib/seo'
import { useLinkProps } from '@tanstack/react-router'

export const PlayerDialog = ({
  meme,
  layoutContext,
  onClose,
  onOpenStudio
}: {
  meme: MemeWithVideo
  layoutContext: string
  onClose: () => void
  onOpenStudio: (meme: MemeWithVideo) => void
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const hls = React.useRef<Hls>(null)
  const shareMeme = useShareMeme()
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

  const copyMemeLink = async () => {
    const text = buildUrl(memeLink.href as string)

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Lien copié', {
        position: 'bottom-center'
      })
    } catch (error) {
      toast.error('Impossible de copier le lien')
    }
  }

  const close = () => {
    videoRef.current?.pause()
    onClose()
  }

  useHotkeys('escape', () => {
    return close()
  })

  const playVideo = () => {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.play().catch(() => {
      // eslint-disable-next-line no-console
      console.warn('Autoplay échoué (native), besoin d’interaction :')
      video.addEventListener('canplay', () => {
        video.play().catch(() => {
          // eslint-disable-next-line no-console
          console.warn('Autoplay échoué (native), besoin d’interaction :')
        })
      })
    })
  }

  React.useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return () => {}
    }

    const videoSrc = buildVideoStreamUrl(meme.video.bunnyId)

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc
    } else if (Hls.isSupported()) {
      hls.current = new Hls()
      hls.current.loadSource(videoSrc)
      hls.current.attachMedia(video)
    }

    return () => {
      hls.current?.destroy()
    }
  }, [meme.id])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden dark">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        role="presentation"
        className="bg-black/90 absolute inset-0"
      />
      <motion.div
        className="absolute top-4 right-4"
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        exit={{ opacity: 0 }}
      >
        <Button size="icon" onClick={close}>
          <X />
        </Button>
      </motion.div>
      <motion.div
        layoutId={`${layoutContext}-item-${meme.id}`}
        onLayoutAnimationComplete={playVideo}
        className="relative w-200 max-w-[90vw]"
      >
        <div className="w-full h-full flex flex-col items-center gap-y-4">
          <h3 className="text-center w-full text-balance text-lg font-bold text-primary">
            {meme.title}
          </h3>
          <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10 z-1">
            <VideoPlayer className="overflow-hidden w-full h-full max-h-full">
              <VideoPlayerContent
                crossOrigin=""
                poster={buildVideoImageUrl(meme.video.bunnyId)}
                className="w-full h-full"
                playsInline
                enableFullscreenOnDoubleClick
                disablePictureInPicture
                disableRemotePlayback
                preload="auto"
                slot="media"
                ref={videoRef}
              />
              <VideoPlayerControlBar>
                <VideoPlayerPlayButton />
                <VideoPlayerTimeRange />
                <VideoPlayerTimeDisplay showDuration />
                <VideoPlayerMuteButton />
                <VideoPlayerVolumeRange />
              </VideoPlayerControlBar>
            </VideoPlayer>
          </div>
          <div
            className="absolute bg-transparent inset-0 -z-1"
            onClick={close}
            role="presentation"
          />
          <div className="w-full flex sm:justify-center gap-2 flex-col sm:max-w-sm">
            <Button
              size="lg"
              variant="default"
              onClick={() => {
                videoRef.current?.pause()

                return onOpenStudio(meme)
              }}
            >
              <Clapperboard />
              Ouvrir dans Studio
            </Button>
            <div className="grid gap-2 grid-cols-2">
              <Button
                size="lg"
                variant="secondary"
                disabled={shareMeme.isPending}
                className="md:hidden w-full"
                onClick={() => {
                  return shareMeme.mutate(meme)
                }}
              >
                <Share2 />
                Partager la vidéo
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  return copyMemeLink()
                }}
              >
                <Clipboard />
                Copier le lien
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={downloadMutation.isPending}
                className="col-span-2 md:col-span-1 w-full"
                onClick={() => {
                  return downloadMutation.mutate(meme)
                }}
              >
                <Download />
                Télécharger la vidéo
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
