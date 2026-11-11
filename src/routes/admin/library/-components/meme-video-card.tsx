import { MemeVideoPlayer } from '~/components/meme/meme-video-player'
import { Card } from '~/components/ui/card'
import type { MemeFullData } from '~/constants/meme'
import { useMemeHls } from '~/hooks/use-meme-hls'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'

type MemeVideoCardProps = {
  meme: MemeFullData
  className?: string
}

export const MemeVideoCard = ({ meme, className }: MemeVideoCardProps) => {
  const { videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: meme.id
  })

  return (
    <Card className={cn('overflow-hidden py-0', className)}>
      <MemeVideoPlayer
        ref={videoCallbackRef}
        poster={buildVideoImageUrl(meme.video.bunnyId)}
        playbackFailure={playbackFailure}
        preload="metadata"
        muted
        className="aspect-video bg-muted dark"
      />
    </Card>
  )
}
