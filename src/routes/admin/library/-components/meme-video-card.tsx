import { Card } from '~/components/ui/card'
import type { MemeFullData } from '~/constants/meme'
import { buildIframeVideoUrl } from '~/lib/bunny'
import { cn } from '~/lib/utils'

type MemeVideoCardProps = {
  meme: MemeFullData
  className?: string
}

export const MemeVideoCard = ({ meme, className }: MemeVideoCardProps) => {
  return (
    <Card className={cn('overflow-hidden py-0', className)}>
      <iframe
        src={`${buildIframeVideoUrl(meme.video.bunnyId)}?autoplay=false&loop=false&muted=true&preload=true&responsive=true`}
        title={meme.title}
        className="aspect-video w-full bg-muted"
        allow="autoplay; fullscreen"
      />
    </Card>
  )
}
