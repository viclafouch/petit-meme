import { Badge } from '@/components/ui/badge'
import { buildVideoImageUrl, buildVideoPreviewUrl } from '@/lib/bunny'

type MemeVideoThumbnailParams = {
  bunnyId: string
  alt: string
  duration: number
  children: React.ReactNode
}

export const MemeVideoThumbnail = ({
  bunnyId,
  alt,
  duration,
  children
}: MemeVideoThumbnailParams) => {
  return (
    <div className="relative size-full isolate">
      <img
        src={buildVideoImageUrl(bunnyId)}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute size-full inset-0 object-cover"
      />
      <img
        src={buildVideoPreviewUrl(bunnyId)}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute size-full inset-0 hidden duration-600 group-hover:block transition-discrete z-10 object-cover opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:block"
      />
      <div className="absolute bottom-1 left-1 z-30">
        <Badge size="sm" variant="black">
          {duration} sec
        </Badge>
      </div>
      <div className="absolute inset-0 z-40">{children}</div>
    </div>
  )
}
