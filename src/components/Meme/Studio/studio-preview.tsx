import React from 'react'
import { Progress } from '@/components/animate-ui/radix/progress'
import { VideoOverlay } from '@/components/Meme/video-overlay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  VideoPlayer,
  VideoPlayerContent
} from '@/components/ui/kibo-ui/video-player'
import { Skeleton } from '@/components/ui/skeleton'
import { useContainedSize } from '@/hooks/use-contained-size'
import { useImageAspectRatio } from '@/hooks/use-image-aspect-ratio'
import { useMemeHls } from '@/hooks/use-meme-hls'
import { buildVideoImageUrl } from '@/lib/bunny'

type ProcessedRatioState = {
  url: string
  ratio: number
}

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

const OriginalVideo = ({ bunnyId }: OriginalVideoParams) => {
  const { videoRef } = useMemeHls({ bunnyId })

  return (
    <VideoPlayer className="overflow-hidden size-full max-h-full dark">
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin=""
        className="size-full"
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        poster={buildVideoImageUrl(bunnyId)}
        slot="media"
        tabIndex={-1}
      />
      <VideoOverlay />
    </VideoPlayer>
  )
}

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
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        slot="media"
        tabIndex={-1}
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight } = event.currentTarget

          if (videoWidth > 0 && videoHeight > 0) {
            onAspectRatioDetected(videoWidth / videoHeight)
          }
        }}
      />
      <VideoOverlay />
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
  const [processedRatio, setProcessedRatio] =
    React.useState<ProcessedRatioState | null>(null)

  const effectiveRatio =
    processedRatio !== null && processedRatio.url === processedVideoUrl
      ? processedRatio.ratio
      : posterRatio
  const size = useContainedSize(containerRef, effectiveRatio)

  const hasValidSize = size.width > 0 && size.height > 0

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
          <div
            className="absolute flex flex-col gap-2 px-4 w-full text-center max-w-md items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <Badge variant="outline">Traitement ({progress}%)</Badge>
            <Progress
              value={progress}
              aria-label={`Progression du traitement : ${progress}%`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              aria-label="Annuler le traitement"
            >
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
          hasValidSize
            ? { width: size.width, height: size.height }
            : { width: '100%', height: '100%' }
        }
      >
        {renderContent()}
      </div>
    </div>
  )
}
