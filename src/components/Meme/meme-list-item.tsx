import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clapperboard,
  Download,
  EllipsisVertical,
  Share2,
  Star
} from 'lucide-react'
import { BunnyPlayIcon } from '@/components/icon/Play'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { MemeWithVideo } from '@/constants/meme'
import { useDownloadMeme } from '@/hooks/use-download-meme'
import { useShareMeme } from '@/hooks/use-share-meme'
import { buildVideoImageUrl, buildVideoPreviewUrl } from '@/lib/bunny'
import { getFavoritesMemesQueryOpts, getMemeByIdQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { toggleBookmarkByMemeId } from '@/server/user'
import { useShowDialog } from '@/stores/dialog.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'

export type MemeListItemProps = {
  meme: MemeWithVideo
  layoutContext: string
  size: keyof typeof sizes
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
} as const

const FavoriteItem = ({ meme }: { meme: MemeWithVideo }) => {
  const queryClient = useQueryClient()
  const query = useQuery(getFavoritesMemesQueryOpts())

  // eslint-disable-next-line no-restricted-syntax
  const isMemeBookmarked = React.useMemo(() => {
    if (!query.data) {
      return false
    }

    return query.data.bookmarks.some((bookmark) => {
      return bookmark.id === meme.id
    })
  }, [query.data, meme.id])

  const toggleFavorite = useMutation({
    mutationFn: toggleBookmarkByMemeId,
    onMutate: async () => {
      const newValue = !isMemeBookmarked

      await queryClient.cancelQueries({
        queryKey: getFavoritesMemesQueryOpts.all
      })

      queryClient.setQueryData(getFavoritesMemesQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        if (!newValue) {
          return {
            bookmarks: old.bookmarks.filter((bookmark) => {
              return bookmark.id !== meme.id
            }),
            count: old.count - 1
          }
        }

        return {
          bookmarks: [meme, ...old.bookmarks],
          count: old.count + 1
        }
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries(getMemeByIdQueryOpts(meme.id))
      void queryClient.invalidateQueries(getFavoritesMemesQueryOpts())
    }
  })

  const handleToggleFavorite = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    toggleFavorite.mutate({
      data: meme.id
    })
  }

  return (
    <DropdownMenuItem
      onClick={handleToggleFavorite}
      disabled={toggleFavorite.isPending}
    >
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
    onPlayClick,
    layoutContext,
    onOpenStudioClick,
    size
  }: MemeListItemProps) => {
    const shareMeme = useShareMeme()
    const downloadMutation = useDownloadMeme()

    return (
      <motion.div
        className="relative flex w-full flex-col gap-2 text-sm sm:min-w-0 group"
        layoutId={`${layoutContext}-item-${meme.id}`}
      >
        <motion.div className="group relative aspect-video w-full text-sm">
          <div className="relative w-full h-full isolate">
            <div className="absolute inset-0 border rounded-lg border-white/10 overflow-hidden">
              <img
                src={buildVideoImageUrl(meme.video.bunnyId)}
                alt={meme.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 border-2 z-10 hidden opacity-0 rounded-lg border-white/50 overflow-hidden duration-600 group-hover:block transition-discrete object-cover group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:block">
              <img
                src={buildVideoPreviewUrl(meme.video.bunnyId)}
                alt={meme.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-1 left-1 z-30">
              <Badge size="sm" variant="black">
                {meme.video.duration} sec
              </Badge>
            </div>
            <button
              className="absolute inset-0 z-40 delay-75 cursor-pointer text-white/80 place-items-center outline-none grid"
              type="button"
              onClick={(event) => {
                event.preventDefault()

                return onPlayClick(meme)
              }}
            >
              <div className="sr-only">Play</div>
              <div className="rounded-full text-white w-8 h-8 md:w-10 md:h-10 aspect-square flex justify-center items-center bg-black/70 opacity-90 border border-muted-foreground md:scale-0 group-hover:scale-100 duration-300 md:opacity-0 group-hover:opacity-100 transition-all group-focus-within:opacity-100 group-focus-within:scale-0 md:group-focus-within:scale-100">
                <BunnyPlayIcon className="fill-white w-3.5 md:w-4.5" />
              </div>
            </button>
          </div>
        </motion.div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-y-1">
            <Link
              to="/memes/$memeId"
              params={{ memeId: meme.id }}
              title={meme.title}
              className={cn('line-clamp-1 text-primary', sizes[size].title)}
            >
              {meme.title}
            </Link>
            <div className="flex flex-row items-center gap-1.5 text-gray-500">
              <span className={cn(sizes[size].views)}>
                {meme.viewCount} vue{meme.viewCount > 1 ? 's' : ''}
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
