import React from 'react'
import { Progress } from '~/components/animate-ui/base/progress'
import { MemeVideoPlayer } from '~/components/meme/meme-video-player'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import type { Meme } from '~/db/generated/prisma/client'
import { useImageAspectRatio } from '~/hooks/use-image-aspect-ratio'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'

type ProcessedRatioState = {
  url: string
  ratio: number
}

type StudioPreviewProps = {
  memeId: Meme['id']
  bunnyId: string
  title: string
  isProcessing: boolean
  progress: number
  processedVideoUrl: string | null
  onCancel: () => void
}

type OriginalVideoProps = {
  memeId: Meme['id']
  bunnyId: string
}

const OriginalVideo = ({ memeId, bunnyId }: OriginalVideoProps) => {
  const { videoCallbackRef, playbackFailure } = useMemeHls({ memeId })

  return (
    <MemeVideoPlayer
      ref={videoCallbackRef}
      poster={buildVideoImageUrl(bunnyId)}
      playbackFailure={playbackFailure}
      tabIndex={-1}
      className="dark"
    />
  )
}

type ProcessedVideoProps = {
  url: string
  onAspectRatioDetected: (ratio: number) => void
}

const ProcessedVideo = ({
  url,
  onAspectRatioDetected
}: ProcessedVideoProps) => {
  return (
    <MemeVideoPlayer
      src={url}
      tabIndex={-1}
      className="dark"
      onLoadedMetadata={(event) => {
        const { videoWidth, videoHeight } = event.currentTarget

        if (videoWidth > 0 && videoHeight > 0) {
          onAspectRatioDetected(videoWidth / videoHeight)
        }
      }}
    />
  )
}

export const StudioPreview = ({
  memeId,
  bunnyId,
  title,
  isProcessing,
  progress,
  processedVideoUrl,
  onCancel
}: StudioPreviewProps) => {
  const posterUrl = buildVideoImageUrl(bunnyId)
  const posterRatio = useImageAspectRatio(posterUrl)
  const [processedRatio, setProcessedRatio] =
    React.useState<ProcessedRatioState | null>(null)

  const effectiveRatio =
    processedRatio?.url === processedVideoUrl
      ? processedRatio.ratio
      : posterRatio

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="size-full flex items-center justify-center relative">
          <Skeleton className="size-full absolute inset-0">
            <img
              src={posterUrl}
              className="blur-xl size-full opacity-60 object-cover"
              alt={title}
              decoding="async"
            />
          </Skeleton>
          <div className="absolute flex flex-col gap-2 px-4 w-full text-center max-w-md items-center justify-center">
            <Badge variant="outline">
              {m.studio_processing({ progress: String(progress) })}
            </Badge>
            <Progress
              value={progress}
              aria-label={m.studio_processing_progress({
                progress: String(progress)
              })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              aria-label={m.studio_cancel_processing()}
            >
              {m.common_cancel()}
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

    return <OriginalVideo memeId={memeId} bunnyId={bunnyId} />
  }

  return (
    <div className="size-full flex items-center justify-center @container-size">
      <div
        className="relative overflow-hidden bg-black rounded-lg border border-white/10 md:border-border md:bg-muted/50 w-[min(100cqw,100cqh*var(--video-ratio))] h-[min(100cqh,100cqw/var(--video-ratio))]"
        style={{ '--video-ratio': effectiveRatio }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
