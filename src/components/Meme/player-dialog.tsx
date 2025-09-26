import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { Clapperboard, Download, Share2, X } from 'lucide-react'
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
import { useShareMeme } from '@/hooks/use-share-meme'
import { buildVideoImageUrl, buildVideoStreamUrl } from '@/lib/bunny'

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
  const downloadMeme = useDownloadMeme()

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
    return () => {
      hls.current?.destroy()
    }
  }, [])

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
        className="relative w-[800px] max-w-[90vw]"
      >
        <div className="w-full h-full flex flex-col items-center gap-y-4">
          <h3 className="text-center w-full text-balance text-lg font-bold text-primary">
            {meme.title}
          </h3>
          <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10 z-[1]">
            <VideoPlayer className="overflow-hidden w-full h-full max-h-full">
              <VideoPlayerContent
                crossOrigin=""
                poster={buildVideoImageUrl(meme.video.bunnyId)}
                className="w-full h-full"
                playsInline
                loop
                enableFullscreenOnDoubleClick
                disablePictureInPicture
                disableRemotePlayback
                preload="auto"
                slot="media"
                ref={(element) => {
                  videoRef.current = element

                  if (!element) {
                    return () => {}
                  }

                  const videoSrc = buildVideoStreamUrl(meme.video.bunnyId)

                  if (element.canPlayType('application/vnd.apple.mpegurl')) {
                    element.src = videoSrc
                  } else if (Hls.isSupported() && !hls.current) {
                    hls.current = new Hls()
                    hls.current.loadSource(videoSrc)
                    hls.current.attachMedia(element)
                  }

                  return () => {}
                }}
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
            className="absolute bg-transparent inset-0 -z-[1]"
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
            <div className="flex gap-2 flex-wrap">
              <Button
                size="lg"
                variant="secondary"
                disabled={shareMeme.isPending}
                className="md:hidden flex-1"
                onClick={() => {
                  return shareMeme.mutate(meme)
                }}
              >
                <Share2 />
                Partager
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                disabled={downloadMeme.isPending}
                onClick={() => {
                  return downloadMeme.mutate(meme)
                }}
              >
                <Download />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
