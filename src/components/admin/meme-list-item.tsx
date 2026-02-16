import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DEFAULT_MEME_TITLE,
  MemeStatusMeta,
  type MemeWithCategories,
  type MemeWithVideo
} from '@/constants/meme'
import { formatViewCount } from '@/helpers/format'
import { buildVideoImageUrl, buildVideoPreviewUrl } from '@/lib/bunny'
import { getVideoStatusByIdQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { matchIsVideoPlayable } from '@/utils/video'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

export type AdminMemeListItemProps = {
  meme: MemeWithVideo & MemeWithCategories
}

export const MemeListItem = React.memo(({ meme }: AdminMemeListItemProps) => {
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
            className="relative size-full isolate"
          >
            <img
              src={buildVideoImageUrl(meme.video.bunnyId)}
              alt={meme.title}
              className="absolute size-full inset-0 object-cover"
            />
            <img
              src={buildVideoPreviewUrl(meme.video.bunnyId)}
              alt={meme.title}
              className="absolute size-full inset-0 hidden duration-600 group-hover:block transition-discrete z-10 object-cover opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:block"
            />
            <div className="absolute bottom-1 left-1 z-30">
              <Badge size="sm" variant="black">
                {meme.video.duration} sec
              </Badge>
            </div>
            <Link
              to="/admin/library/$memeId"
              className="absolute inset-0 md:opacity-0 group-hover:opacity-100 transition-all z-40 delay-75 cursor-pointer text-white/80 place-items-center group-focus-within:opacity-100 outline-none grid"
              params={{ memeId: meme.id }}
            />
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
              meme.title === 'Titre inconnu' ||
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
            {meme.categories.length > 0 ? (
              <span className="text-muted-foreground text-xs">
                {meme.categories.length} catégorie
                {meme.categories.length > 1 ? 's' : ''}
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
