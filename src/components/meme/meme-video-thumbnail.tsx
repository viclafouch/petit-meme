import { Badge } from '~/components/ui/badge'
import { formatSeconds } from '~/helpers/duration'
import {
  buildVideoImageUrl,
  buildVideoPreviewUrl
} from '~/lib/bunny-public-urls'
import { getLocale } from '~/paraglide/runtime'

export type ThumbnailPriority = 'lcp' | 'eager' | 'lazy'

type MemeVideoThumbnailProps = {
  bunnyId: string
  duration: number
  children: React.ReactNode
  priority?: ThumbnailPriority
}

export const MemeVideoThumbnail = ({
  bunnyId,
  duration,
  priority = 'lazy',
  children
}: MemeVideoThumbnailProps) => {
  return (
    <div data-meme-thumbnail className="relative size-full isolate">
      <img
        src={buildVideoImageUrl(bunnyId)}
        alt=""
        loading={priority === 'lazy' ? 'lazy' : undefined}
        fetchPriority={priority === 'lcp' ? 'high' : undefined}
        decoding="async"
        className="absolute size-full inset-0 object-cover"
      />
      <img
        src={buildVideoPreviewUrl(bunnyId)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute size-full inset-0 z-10 object-cover hidden opacity-0 transition-[opacity,display] transition-discrete duration-600 group-hover:block group-hover:opacity-100 group-hover:starting:opacity-0 group-focus-within:block group-focus-within:opacity-100 group-focus-within:starting:opacity-0"
      />
      <div className="absolute bottom-1 left-1 z-30">
        <Badge size="sm" variant="black">
          {formatSeconds(duration, getLocale())}
        </Badge>
      </div>
      <div className="absolute inset-0 z-40">{children}</div>
    </div>
  )
}
