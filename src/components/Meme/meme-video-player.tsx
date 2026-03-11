import { VideoOverlay } from '@/components/Meme/video-overlay'
import {
  VideoPlayer,
  VideoPlayerContent,
  type VideoPlayerContentProps
} from '@/components/ui/kibo-ui/video-player'
import { cn } from '@/lib/utils'
import { ClientOnly } from '@tanstack/react-router'

type MemeVideoPlayerParams = {
  showOverlay?: boolean
  showRemainingTime?: boolean
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
  className,
  preload = 'auto',
  ref,
  ...videoProps
}: MemeVideoPlayerParams) => {
  return (
    <VideoPlayer
      className={cn('size-full max-h-full overflow-hidden', className)}
    >
      <VideoPlayerContent
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
    </VideoPlayer>
  )
}
