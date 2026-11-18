import { MemePlayer } from '~/components/meme/meme-player'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { Card } from '~/components/ui/card'
import type { MemeFullData } from '~/constants/meme'
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
      <MemePlayer
        bunnyId={meme.video.bunnyId}
        title={meme.title}
        preload="metadata"
        muted
        onVideoChange={videoCallbackRef}
        playbackFailure={playbackFailure}
        className="block aspect-video w-full bg-black"
      />
    </Card>
  )
}
