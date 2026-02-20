import React from 'react'
import {
  ArrowRight,
  Clapperboard,
  Download,
  EllipsisVertical,
  Share2,
  Star
} from 'lucide-react'
import { motion } from 'motion/react'
import { BunnyPlayIcon } from '@/components/icon/Play'
import { MemeVideoThumbnail } from '@/components/Meme/meme-video-thumbnail'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { MemeWithVideo } from '@/constants/meme'
import { formatViewCount } from '@/helpers/format'
import { useDownloadMeme } from '@/hooks/use-download-meme'
import { useShareMeme } from '@/hooks/use-share-meme'
import { useToggleBookmark } from '@/hooks/use-toggle-bookmark'
import { sendClickAfterSearch } from '@/lib/algolia-insights'
import { getFavoritesMemesQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useShowDialog } from '@/stores/dialog.store'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'

export type MemeListItemParams = {
  meme: MemeWithVideo
  highlightedTitle?: string
  layoutContext: string
  size: keyof typeof sizes
  queryID?: string
  position: number
  onPlayClick: (meme: MemeWithVideo) => void
  onOpenStudioClick: (meme: MemeWithVideo) => void
}

const sizes = {
  sm: {
    title: 'font-normal text-xs leading-none',
    views: 'text-xs',
    icon: 'size-4'
  },
  md: {
    title: 'font-medium text-md leading-none',
    views: 'text-md',
    icon: 'size-5'
  }
} as const satisfies Record<string, Record<string, string>>

const FavoriteItem = ({ meme }: { meme: MemeWithVideo }) => {
  const query = useQuery(getFavoritesMemesQueryOpts())

  const { isMemeBookmarked, isPending, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: query.data?.bookmarks
  })

  const handleToggleFavorite = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    toggleBookmark()
  }

  return (
    <DropdownMenuItem onClick={handleToggleFavorite} disabled={isPending}>
      <Star
        data-active={isMemeBookmarked}
        className="data-[active=true]:fill-muted-foreground"
      />
      {isMemeBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    </DropdownMenuItem>
  )
}

const FavoriteItemGuard = ({ meme }: { meme: MemeWithVideo }) => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()

  if (!user) {
    return (
      <DropdownMenuItem
        onClick={(event) => {
          event.preventDefault()
          showDialog('auth', {})
        }}
      >
        <Star />
        Ajouter aux favoris
      </DropdownMenuItem>
    )
  }

  return <FavoriteItem meme={meme} />
}

export const MemeListItem = React.memo(
  ({
    meme,
    highlightedTitle,
    onPlayClick,
    layoutContext,
    onOpenStudioClick,
    size,
    queryID,
    position
  }: MemeListItemParams) => {
    const shareMeme = useShareMeme()
    const downloadMutation = useDownloadMeme()

    const handleTrackClick = () => {
      if (!queryID) {
        return
      }

      sendClickAfterSearch({
        queryID,
        objectID: meme.id,
        position
      })
    }

    return (
      <motion.div
        className="relative flex w-full flex-col gap-2 text-sm sm:min-w-0 group"
        layoutId={`${layoutContext}-item-${meme.id}`}
      >
        <motion.div className="group relative aspect-video w-full text-sm overflow-hidden rounded-lg border border-white/10">
          <MemeVideoThumbnail
            bunnyId={meme.video.bunnyId}
            alt={meme.title}
            duration={meme.video.duration}
          >
            <button
              className="size-full delay-75 cursor-pointer text-white/80 place-items-center outline-none grid"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                handleTrackClick()

                return onPlayClick(meme)
              }}
            >
              <div className="sr-only">Play</div>
              <div className="rounded-full text-white size-8 md:size-10 flex justify-center items-center bg-black/70 opacity-90 border border-muted-foreground md:opacity-0 group-hover:opacity-100 duration-300 transition-all group-focus-within:opacity-100">
                <BunnyPlayIcon className="fill-white w-3.5 md:w-4.5" />
              </div>
            </button>
          </MemeVideoThumbnail>
        </motion.div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-y-1">
            <Link
              to="/memes/$memeId"
              params={{ memeId: meme.id }}
              title={meme.title}
              className={cn('line-clamp-1 text-primary', sizes[size].title)}
              onClick={handleTrackClick}
            >
              {highlightedTitle ? (
                <span
                  className="[&>em]:not-italic [&>em]:bg-yellow-200 [&>em]:text-black [&>em]:rounded-sm"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: highlightedTitle }}
                />
              ) : (
                meme.title
              )}
            </Link>
            <div className="flex flex-row items-center gap-1.5 text-muted-foreground">
              <span className={cn(sizes[size].views)}>
                {formatViewCount(meme.viewCount)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <EllipsisVertical className={cn(sizes[size].icon)} />
                <span className="sr-only">Open options</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link to="/memes/$memeId" params={{ memeId: meme.id }}>
                    <ArrowRight />
                    Détails
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    return onOpenStudioClick(meme)
                  }}
                >
                  <Clapperboard />
                  Ouvrir dans Studio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    return shareMeme.mutate(meme)
                  }}
                  className="md:hidden"
                >
                  <Share2 />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    return downloadMutation.mutate(meme)
                  }}
                >
                  <Download />
                  Télécharger
                </DropdownMenuItem>
                <FavoriteItemGuard meme={meme} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>
    )
  }
)
