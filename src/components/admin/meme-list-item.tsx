import React from 'react'
import { motion } from 'motion/react'
import { MemeVideoThumbnail } from '@/components/Meme/meme-video-thumbnail'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DEFAULT_MEME_TITLE,
  LEGACY_MEME_TITLE,
  MemeStatusMeta
} from '@/constants/meme'
import { formatCategoryCount, formatViewCount } from '@/helpers/format'
import type { AlgoliaMemeRecord } from '@/lib/algolia'
import { getVideoStatusByIdQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { matchIsVideoPlayable } from '@/utils/video'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

export type AdminMemeListItemParams = {
  meme: AlgoliaMemeRecord
}

export const MemeListItem = React.memo(({ meme }: AdminMemeListItemParams) => {
  const isInitiallyPlayable = matchIsVideoPlayable(meme.video.bunnyStatus)

  const videoStatusQuery = useQuery({
    ...getVideoStatusByIdQueryOpts(meme.video.id),
    enabled: !isInitiallyPlayable,
    refetchInterval: ({ state }) => {
      if (state.data?.status && matchIsVideoPlayable(state.data.status)) {
        return false
      }

      return 3000
    }
  })

  const currentStatus = videoStatusQuery.data?.status ?? meme.video.bunnyStatus
  const isPlayable = matchIsVideoPlayable(currentStatus)
  const statusMeta = MemeStatusMeta[meme.status]
  const hasPlaceholderTitle =
    meme.title === LEGACY_MEME_TITLE || meme.title === DEFAULT_MEME_TITLE

  return (
    <motion.div className="group relative flex w-full flex-col gap-2 text-sm sm:min-w-0">
      <motion.div className="group bg-muted relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 text-sm">
        {isPlayable ? (
          <motion.div
            initial={{ opacity: isInitiallyPlayable ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="relative size-full"
          >
            <MemeVideoThumbnail
              bunnyId={meme.video.bunnyId}
              alt={meme.title}
              duration={meme.video.duration}
            >
              <Link
                to="/admin/library/$memeId"
                className="size-full cursor-pointer place-items-center text-white/80 outline-none transition-all delay-75 md:opacity-0 grid group-hover:opacity-100 group-focus-within:opacity-100"
                params={{ memeId: meme.id }}
              />
            </MemeVideoThumbnail>
          </motion.div>
        ) : (
          <div className="relative flex size-full items-center justify-center">
            <Skeleton className="absolute inset-0 size-full bg-muted" />
            <div className="absolute">
              <Badge variant="outline">Processing...</Badge>
            </div>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 z-30">
          <Badge variant={statusMeta.badgeVariant} size="sm">
            {statusMeta.label}
          </Badge>
        </div>
      </motion.div>
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex w-full flex-col gap-1.5">
          <Link
            to="/admin/library/$memeId"
            params={{ memeId: meme.id }}
            title={meme.title}
            className={cn(
              'line-clamp-1 font-medium leading-none text-foreground',
              hasPlaceholderTitle && 'text-destructive-foreground'
            )}
          >
            {meme.title}
          </Link>
          <div className="relative flex w-full flex-row items-center gap-1.5 text-muted-foreground">
            <span className="text-xs leading-none">
              {formatViewCount(meme.viewCount)}
            </span>
            {' • '}
            <span
              className={cn(
                'text-xs',
                meme.categoryCount > 0
                  ? 'text-muted-foreground'
                  : 'text-destructive-foreground'
              )}
            >
              {formatCategoryCount(meme.categoryCount)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
