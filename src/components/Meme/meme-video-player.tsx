import { ClientOnly } from '@tanstack/react-router'
import { VideoOverlay } from '~/components/Meme/video-overlay'
import { VideoPlaybackError } from '~/components/Meme/video-playback-error'
import {
  VideoPlayer,
  VideoPlayerContent,
  type VideoPlayerContentProps
} from '~/components/ui/kibo-ui/video-player'
import type { useMemeHls } from '~/hooks/use-meme-hls'
import { cn } from '~/lib/utils'

type MemeVideoPlayerProps = {
  showOverlay?: boolean
  showRemainingTime?: boolean
  playbackFailure?: ReturnType<typeof useMemeHls>['playbackFailure']
  className?: string
} & Omit<
  VideoPlayerContentProps,
  | 'className'
  | 'crossOrigin'
  | 'playsInline'
  | 'disablePictureInPicture'
  | 'disableRemotePlayback'
  | 'slot'
>

export const MemeVideoPlayer = ({
  showOverlay = true,
  showRemainingTime = false,
  playbackFailure,
  className,
  preload = 'auto',
  ref,
  ...videoProps
}: MemeVideoPlayerProps) => {
  return (
    <VideoPlayer
      data-testid="meme-video-player"
      className={cn('size-full max-h-full overflow-hidden', className)}
    >
      <VideoPlayerContent
        data-testid="meme-video"
        crossOrigin=""
        className="size-full"
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload={preload}
        slot="media"
        ref={ref}
        {...videoProps}
      />
      {showOverlay ? (
        <ClientOnly>
          <VideoOverlay showRemainingTime={showRemainingTime} />
        </ClientOnly>
      ) : null}
      {playbackFailure ? (
        <VideoPlaybackError onRetry={playbackFailure.handleRetry} />
      ) : null}
    </VideoPlayer>
  )
}
