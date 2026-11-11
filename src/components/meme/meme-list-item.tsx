import React from 'react'
import { ArrowRight, Clapperboard, EllipsisVertical, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { BunnyPlayIcon } from '~/components/icon/play'
import { MemeExportSubmenu } from '~/components/meme/meme-export-menu'
import { MemeLanguageBadge } from '~/components/meme/meme-language-badge'
import { MemeVideoThumbnail } from '~/components/meme/meme-video-thumbnail'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { useToggleBookmark } from '~/components/meme/use-toggle-bookmark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import type { MemeWithVideo } from '~/constants/meme'
import { matchIsContentLocaleForeign } from '~/helpers/i18n-content'
import {
  sendClickEvent,
  sendConversionEvent,
  type ConversionEventName
} from '~/lib/algolia-insights'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { dialogStore } from '~/stores/dialog.store'

export type MemeListItemProps = {
  meme: MemeWithVideo
  layoutContext: string
  size: keyof typeof sizes
  position: number
  onPlayClick: (meme: MemeWithVideo, trigger: HTMLButtonElement) => void
  highlightedTitle?: string
  queryID?: string
  authenticatedUserToken?: string
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

type BookmarkItemProps = {
  meme: MemeWithVideo
  queryID?: string
  authenticatedUserToken?: string
}

type BookmarkItemGuardProps = BookmarkItemProps

const BookmarkItem = ({
  meme,
  queryID,
  authenticatedUserToken
}: BookmarkItemProps) => {
  const bookmarkedMemesQuery = useQuery(listBookmarkedMemesQueryOpts())

  const { isMemeBookmarked, isPending, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: bookmarkedMemesQuery.data?.bookmarks
  })

  const handleToggleBookmark = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (!isMemeBookmarked) {
      sendConversionEvent({
        queryID,
        objectID: meme.id,
        eventName: 'Meme Bookmarked',
        authenticatedUserToken
      })
    }

    toggleBookmark()
  }

  return (
    <DropdownMenuItem onClick={handleToggleBookmark} disabled={isPending}>
      <Star
        data-active={isMemeBookmarked}
        className="data-[active=true]:fill-muted-foreground"
      />
      {isMemeBookmarked ? m.meme_remove_bookmark() : m.meme_add_bookmark()}
    </DropdownMenuItem>
  )
}

const BookmarkItemGuard = ({
  meme,
  queryID,
  authenticatedUserToken
}: BookmarkItemGuardProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  if (!user) {
    return (
      <DropdownMenuItem
        onClick={(event) => {
          event.preventDefault()
          dialogStore.actions.showDialog('auth')
        }}
      >
        <Star />
        {m.meme_add_bookmark()}
      </DropdownMenuItem>
    )
  }

  return (
    <BookmarkItem
      meme={meme}
      queryID={queryID}
      authenticatedUserToken={authenticatedUserToken}
    />
  )
}

export const MemeListItem = React.memo(
  ({
    meme,
    highlightedTitle,
    onPlayClick,
    layoutContext,
    size,
    queryID,
    position,
    authenticatedUserToken
  }: MemeListItemProps) => {
    const shareMutation = useMemeExport({ mode: 'share', queryID })
    const downloadMutation = useMemeExport({ mode: 'download', queryID })

    const handleTrackClick = () => {
      sendClickEvent({
        queryID,
        objectID: meme.id,
        position,
        authenticatedUserToken
      })
    }

    const handleTrackConversion = (eventName: ConversionEventName) => {
      sendConversionEvent({
        queryID,
        objectID: meme.id,
        eventName,
        authenticatedUserToken
      })
    }

    return (
      <motion.li
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
                onPlayClick(meme, event.currentTarget)
              }}
            >
              <div className="sr-only">{m.meme_play_video()}</div>
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
                  // oxlint-disable-next-line react/no-danger -- Algolia returns the highlighted title as HTML with <em> tags
                  dangerouslySetInnerHTML={{ __html: highlightedTitle }}
                />
              ) : (
                meme.title
              )}
            </Link>
            <div className="flex flex-row items-center gap-1.5 text-muted-foreground">
              {matchIsContentLocaleForeign(meme.contentLocale, getLocale()) ? (
                <MemeLanguageBadge contentLocale={meme.contentLocale} />
              ) : null}
              <span className={cn(sizes[size].views)}>
                {m.meme_views({ count: meme.viewCount })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <EllipsisVertical className={cn(sizes[size].icon)} />
                <span className="sr-only">{m.meme_open_options()}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto">
                <DropdownMenuLinkItem
                  render={
                    <Link to="/memes/$memeId" params={{ memeId: meme.id }} />
                  }
                >
                  <ArrowRight />
                  {m.meme_details()}
                </DropdownMenuLinkItem>
                <DropdownMenuLinkItem
                  render={
                    <Link
                      to="/memes/$memeId/studio"
                      params={{ memeId: meme.id }}
                    />
                  }
                  onClick={() => {
                    handleTrackConversion('Meme Studio Opened')
                  }}
                >
                  <Clapperboard />
                  {m.meme_open_studio()}
                </DropdownMenuLinkItem>
                <MemeExportSubmenu
                  mode="share"
                  className="md:hidden"
                  onExport={(format) => {
                    shareMutation.trigger(meme, format)
                  }}
                />
                <MemeExportSubmenu
                  mode="download"
                  onExport={(format) => {
                    downloadMutation.trigger(meme, format)
                  }}
                />
                <BookmarkItemGuard
                  meme={meme}
                  queryID={queryID}
                  authenticatedUserToken={authenticatedUserToken}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.li>
    )
  }
)
