import React from 'react'
import {
  ArrowRight,
  Clapperboard,
  EllipsisVertical,
  Smartphone
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { BookmarkStar } from '~/components/meme/bookmark-star'
import { MemeActionsSheet } from '~/components/meme/meme-actions-sheet'
import { MemeExportSubmenu } from '~/components/meme/meme-export-menu'
import type { ThumbnailPriority } from '~/components/meme/meme-grid'
import { MemeHighlightedTitle } from '~/components/meme/meme-highlighted-title'
import { MemeLanguageBadge } from '~/components/meme/meme-language-badge'
import { useBookmarkAction } from '~/components/meme/use-bookmark-action'
import { useCloseWhenDialogOpens } from '~/components/meme/use-close-when-dialog-opens'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { useOpenStudioSheet } from '~/components/studio/use-studio-history'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { DAY, DAYS_PER_WEEK } from '~/constants/time'
import { formatClockDuration } from '~/helpers/duration'
import type { HighlightedText } from '~/helpers/highlight'
import { matchIsContentLocaleForeign } from '~/helpers/i18n-content'
import { formatCount } from '~/helpers/number'
import { toStudioMeme } from '~/helpers/studio-meme'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
import {
  sendClickEvent,
  sendConversionEvent,
  type ConversionEventName
} from '~/lib/algolia-insights'
import {
  buildVideoImageUrl,
  buildVideoPreviewUrl
} from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const WIDESCREEN_WIDTH = 16
const WIDESCREEN_HEIGHT = 9
const WIDESCREEN_RATIO = WIDESCREEN_WIDTH / WIDESCREEN_HEIGHT
const WIDESCREEN_TOLERANCE = 0.15
const PORTRAIT_MAX_RATIO = 0.9
const NEW_MEME_MAX_AGE_MS = DAYS_PER_WEEK * DAY

const MEME_CARD_MENU_CLASS_NAME =
  'relative z-(--z-floating) col-start-2 row-start-2 -mt-1 -me-1.5 grid size-7 touch-manipulation place-items-center rounded-full text-muted-foreground after:absolute after:-inset-1.5 focus-visible:focus-ring data-popup-open:bg-foreground/10 mouse:hover:bg-foreground/10 mouse:hover:text-foreground [&_svg]:size-4'

const MEME_CARD_BADGE_CLASS_NAME =
  'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm bg-shade-strong px-1.5 text-xs leading-none font-medium text-white tabular-nums has-[>svg]:px-1 [&_svg]:size-3.5'

type MemeCardMeme = MemeWithVideo & {
  highlightedTitle?: HighlightedText
}

export type MemeCardProps = {
  meme: MemeCardMeme
  position: number
  now?: number
  priority?: ThumbnailPriority
  titleTag?: 'h2' | 'h3'
  queryID?: string
  authenticatedUserToken?: string
}

const readVideoRatio = (meme: MemeWithVideo) => {
  const { width, height } = meme.video

  return width && height ? width / height : WIDESCREEN_RATIO
}

type MemeCardMenuProps = {
  meme: MemeCardMeme
  queryID?: string
  authenticatedUserToken?: string
}

const MemeCardMenu = ({
  meme,
  queryID,
  authenticatedUserToken
}: MemeCardMenuProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const shareMutation = useMemeExport({ mode: 'share', queryID })
  const downloadMutation = useMemeExport({ mode: 'download', queryID })
  const openStudioSheet = useOpenStudioSheet()
  const bookmarkAction = useBookmarkAction({
    meme,
    queryID,
    authenticatedUserToken
  })

  const handleTrackConversion = (eventName: ConversionEventName) => {
    sendConversionEvent({
      queryID,
      objectID: meme.id,
      eventName,
      authenticatedUserToken
    })
  }

  const handleOpenStudio = () => {
    handleTrackConversion('Meme Studio Opened')
    openStudioSheet(toStudioMeme(meme))
  }

  const handleExport = (mode: MemeExportMode, format: MemeDerivedFormat) => {
    const exportMutation = mode === 'share' ? shareMutation : downloadMutation

    exportMutation.trigger(meme, format)
  }

  const optionsLabel = m.meme_open_options_named({ title: meme.title })

  useCloseWhenDialogOpens(() => {
    setIsMenuOpen(false)
  })

  if (isCoarsePointer) {
    return (
      <MemeActionsSheet
        meme={meme}
        queryID={queryID}
        authenticatedUserToken={authenticatedUserToken}
        onStudioOpen={handleOpenStudio}
        onExport={handleExport}
        render={
          <button
            type="button"
            aria-label={optionsLabel}
            className={MEME_CARD_MENU_CLASS_NAME}
          />
        }
      >
        <EllipsisVertical aria-hidden="true" />
      </MemeActionsSheet>
    )
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger
        className={MEME_CARD_MENU_CLASS_NAME}
        aria-label={optionsLabel}
      >
        <EllipsisVertical aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-56" align="end">
        <MemeExportSubmenu
          mode="download"
          onExport={(format) => {
            handleExport('download', format)
          }}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenStudio}>
          <Clapperboard />
          {m.meme_open_studio()}
        </DropdownMenuItem>
        <DropdownMenuItem
          closeOnClick={!bookmarkAction.isSignedIn}
          onClick={() => {
            bookmarkAction.selectBookmark()
          }}
        >
          <BookmarkStar isActive={bookmarkAction.isMemeBookmarked} />
          {bookmarkAction.label}
        </DropdownMenuItem>
        <DropdownMenuLinkItem
          render={<Link to="/memes/$memeId" params={{ memeId: meme.id }} />}
        >
          <ArrowRight />
          {m.meme_details()}
        </DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const MemeCard = React.memo(
  ({
    meme,
    position,
    now,
    priority = 'lazy',
    titleTag: TitleTag = 'h3',
    queryID,
    authenticatedUserToken
  }: MemeCardProps) => {
    const locale = getLocale()
    const ratio = readVideoRatio(meme)
    const isWidescreen =
      Math.abs(ratio - WIDESCREEN_RATIO) <= WIDESCREEN_TOLERANCE
    const isPortrait = ratio < PORTRAIT_MAX_RATIO
    const isNew =
      now !== undefined &&
      meme.publishedAt !== null &&
      now - meme.publishedAt.getTime() < NEW_MEME_MAX_AGE_MS
    const thumbnailUrl = buildVideoImageUrl(meme.video.bunnyId)

    const handleTrackClick = () => {
      sendClickEvent({
        queryID,
        objectID: meme.id,
        position,
        authenticatedUserToken
      })
    }

    return (
      <article
        className="meme-card relative grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto_1fr] gap-x-1"
        data-fit={isWidescreen ? 'cover' : 'contain'}
        style={{ '--meme-ratio': ratio }}
      >
        <div className="meme-card-thumb relative isolate col-span-full mb-2 aspect-video overflow-hidden rounded-lg bg-stage [&>img]:absolute [&>img]:inset-0 [&>img]:size-full">
          {isWidescreen ? null : (
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              loading={priority === 'lazy' ? 'lazy' : undefined}
              decoding="async"
              className="scale-120 object-cover [filter:var(--filter-backdrop-thumb)]"
            />
          )}
          <img
            src={thumbnailUrl}
            alt=""
            loading={priority === 'lazy' ? 'lazy' : undefined}
            fetchPriority={priority === 'lcp' ? 'high' : undefined}
            decoding="async"
            className={isWidescreen ? 'object-cover' : 'object-contain'}
          />
          <img
            src={buildVideoPreviewUrl(meme.video.bunnyId)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="meme-card-preview"
          />
          <span className="absolute top-1.5 left-1.5 z-(--z-floating) flex gap-1">
            {isNew ? (
              <span
                className={cn(
                  MEME_CARD_BADGE_CLASS_NAME,
                  'bg-(image:--gradient-brand) font-semibold text-brand-foreground'
                )}
              >
                {m.meme_new_badge()}
              </span>
            ) : null}
            {isPortrait ? (
              <span
                className={MEME_CARD_BADGE_CLASS_NAME}
                title={m.meme_format_mobile()}
              >
                <Smartphone aria-hidden="true" />
                <span className="sr-only">{m.meme_format_mobile()}</span>
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              MEME_CARD_BADGE_CLASS_NAME,
              'absolute right-1.5 bottom-1.5 z-(--z-floating)'
            )}
          >
            {formatClockDuration(meme.video.duration, locale)}
          </span>
        </div>
        <TitleTag className="col-start-1 text-sm leading-[1.3] font-semibold text-pretty wrap-anywhere">
          <Link
            to="/memes/$memeId"
            params={{ memeId: meme.id }}
            className="meme-card-link line-clamp-2 min-h-[2lh] outline-none after:absolute after:inset-0 after:z-(--z-raised)"
            onClick={handleTrackClick}
          >
            <MemeHighlightedTitle
              title={meme.title}
              highlightedTitle={meme.highlightedTitle}
            />
          </Link>
        </TitleTag>
        <p className="col-span-full mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
          <span>
            {m.meme_views({
              count: meme.viewCount,
              formattedCount: formatCount(meme.viewCount, locale, 'compact')
            })}
          </span>
          {matchIsContentLocaleForeign(meme.contentLocale, locale) ? (
            <MemeLanguageBadge contentLocale={meme.contentLocale} />
          ) : null}
        </p>
        <MemeCardMenu
          meme={meme}
          queryID={queryID}
          authenticatedUserToken={authenticatedUserToken}
        />
      </article>
    )
  }
)
