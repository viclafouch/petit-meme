import React from 'react'
import { Progress } from '@/components/animate-ui/radix/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  VideoFullScreenButton,
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange
} from '@/components/ui/kibo-ui/video-player'
import { Skeleton } from '@/components/ui/skeleton'
import { useContainedSize } from '@/hooks/use-contained-size'
import { useImageAspectRatio } from '@/hooks/use-image-aspect-ratio'
import { useMemeHls } from '@/hooks/use-meme-hls'
import { buildVideoImageUrl } from '@/lib/bunny'

type StudioPreviewParams = {
  bunnyId: string
  title: string
  isProcessing: boolean
  progress: number
  processedVideoUrl: string | null
  onCancel: () => void
}

type OriginalVideoParams = {
  bunnyId: string
}

const OriginalVideo = React.memo(({ bunnyId }: OriginalVideoParams) => {
  const { videoRef } = useMemeHls({ bunnyId })

  return (
    <VideoPlayer className="overflow-hidden size-full max-h-full dark">
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin=""
        className="size-full"
        enableFullscreenOnDoubleClick
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        poster={buildVideoImageUrl(bunnyId)}
        slot="media"
        tabIndex={-1}
      />
      <VideoPlayerControlBar>
        <VideoPlayerPlayButton />
        <VideoPlayerTimeRange />
        <VideoPlayerTimeDisplay showDuration />
        <VideoPlayerMuteButton />
        <VideoPlayerVolumeRange />
        <VideoFullScreenButton />
      </VideoPlayerControlBar>
    </VideoPlayer>
  )
})

type ProcessedVideoParams = {
  url: string
  onAspectRatioDetected: (ratio: number) => void
}

const ProcessedVideo = ({
  url,
  onAspectRatioDetected
}: ProcessedVideoParams) => {
  return (
    <VideoPlayer className="overflow-hidden size-full max-h-full dark">
      <VideoPlayerContent
        crossOrigin=""
        className="size-full"
        src={url}
        playsInline
        enableFullscreenOnDoubleClick
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        slot="media"
        tabIndex={-1}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget as HTMLVideoElement

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            onAspectRatioDetected(video.videoWidth / video.videoHeight)
          }
        }}
      />
      <VideoPlayerControlBar>
        <VideoPlayerPlayButton />
        <VideoPlayerTimeRange />
        <VideoPlayerTimeDisplay showDuration />
        <VideoPlayerMuteButton />
        <VideoPlayerVolumeRange />
        <VideoFullScreenButton />
      </VideoPlayerControlBar>
    </VideoPlayer>
  )
}

export const StudioPreview = ({
  bunnyId,
  title,
  isProcessing,
  progress,
  processedVideoUrl,
  onCancel
}: StudioPreviewParams) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const posterUrl = buildVideoImageUrl(bunnyId)
  const posterRatio = useImageAspectRatio(posterUrl)
  const [processedRatio, setProcessedRatio] = React.useState<{
    url: string
    ratio: number
  } | null>(null)

  const effectiveRatio =
    processedRatio !== null && processedRatio.url === processedVideoUrl
      ? processedRatio.ratio
      : posterRatio
  const size = useContainedSize(containerRef, effectiveRatio)

  const hasDesktopSize = size.width > 0 && size.height > 0

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="size-full flex items-center justify-center relative">
          <Skeleton className="size-full absolute inset-0">
            <img
              src={posterUrl}
              className="blur-xl size-full opacity-60 object-cover"
              alt={title}
              loading="eager"
              decoding="async"
            />
          </Skeleton>
          <div className="absolute flex flex-col gap-2 px-4 w-full text-center max-w-md items-center justify-center">
            <Badge variant="outline">Traitement ({progress}%)</Badge>
            <Progress value={progress} />
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      )
    }

    if (processedVideoUrl !== null) {
      return (
        <ProcessedVideo
          url={processedVideoUrl}
          onAspectRatioDetected={(ratio) => {
            setProcessedRatio({ url: processedVideoUrl, ratio })
          }}
        />
      )
    }

    return <OriginalVideo bunnyId={bunnyId} />
  }

  return (
    <div
      ref={containerRef}
      className="size-full flex items-center justify-center"
    >
      <div
        className="relative overflow-hidden bg-black rounded-lg border border-white/10 md:border-border md:bg-muted/50"
        style={
          hasDesktopSize
            ? { width: size.width, height: size.height }
            : { width: '100%', height: '100%' }
        }
      >
        {renderContent()}
      </div>
    </div>
  )
}
