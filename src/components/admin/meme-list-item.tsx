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
import { formatViewCount } from '@/helpers/format'
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
  const isVideoInitialPlayable = matchIsVideoPlayable(meme.video.bunnyStatus)

  const videoStatusQuery = useQuery({
    ...getVideoStatusByIdQueryOpts(meme.video.id),
    enabled: !isVideoInitialPlayable,
    refetchInterval: ({ state }) => {
      if (state.data?.status && matchIsVideoPlayable(state.data.status)) {
        return false
      }

      return 3000
    }
  })

  const status = videoStatusQuery.data?.status ?? meme.video.bunnyStatus
  const isStatusPlayable = matchIsVideoPlayable(status)

  return (
    <motion.div className="relative flex w-full flex-col gap-2 text-sm sm:min-w-0 group">
      <motion.div className="group bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10">
        {isStatusPlayable ? (
          <motion.div
            initial={{ opacity: isVideoInitialPlayable ? 1 : 0 }}
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
                className="size-full md:opacity-0 group-hover:opacity-100 transition-all delay-75 cursor-pointer text-white/80 place-items-center group-focus-within:opacity-100 outline-none grid"
                params={{ memeId: meme.id }}
              />
            </MemeVideoThumbnail>
          </motion.div>
        ) : (
          <div className="size-full flex items-center justify-center relative">
            <Skeleton className="size-full bg-muted absolute inset-0" />
            <div className="absolute">
              <Badge variant="outline">Processing...</Badge>
            </div>
          </div>
        )}
      </motion.div>
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex flex-col gap-1.5 w-full">
          <Link
            to="/admin/library/$memeId"
            params={{ memeId: meme.id }}
            title={meme.title}
            className={cn(
              'line-clamp-1 font-medium leading-none text-foreground',
              meme.title === LEGACY_MEME_TITLE ||
                meme.title === DEFAULT_MEME_TITLE
                ? 'text-destructive-foreground'
                : undefined
            )}
          >
            {meme.title}
          </Link>
          <div className="flex flex-row items-center gap-1.5 text-muted-foreground w-full relative">
            <span className="text-xs leading-none">
              {formatViewCount(meme.viewCount)}
            </span>
            {' • '}
            {meme.categoryCount > 0 ? (
              <span className="text-muted-foreground text-xs">
                {meme.categoryCount} catégorie
                {meme.categoryCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-destructive-foreground text-xs">
                Aucune catégorie
              </span>
            )}
            {' • '}
            <Badge variant={MemeStatusMeta[meme.status].badgeVariant} size="sm">
              <span>{MemeStatusMeta[meme.status].label}</span>
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
