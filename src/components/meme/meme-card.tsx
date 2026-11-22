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
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const WIDESCREEN_WIDTH = 16
const WIDESCREEN_HEIGHT = 9
const WIDESCREEN_RATIO = WIDESCREEN_WIDTH / WIDESCREEN_HEIGHT
const WIDESCREEN_TOLERANCE = 0.15
const PORTRAIT_MAX_RATIO = 0.9
const NEW_MEME_MAX_AGE_MS = DAYS_PER_WEEK * DAY

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
            className="meme-card-menu"
          />
        }
      >
        <EllipsisVertical aria-hidden="true" />
      </MemeActionsSheet>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="meme-card-menu" aria-label={optionsLabel}>
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
        className="meme-card"
        data-fit={isWidescreen ? 'cover' : 'contain'}
        style={{ '--meme-ratio': ratio }}
      >
        <div className="meme-card-thumb">
          {isWidescreen ? null : (
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              loading={priority === 'lazy' ? 'lazy' : undefined}
              decoding="async"
              className="meme-card-fill"
            />
          )}
          <img
            src={thumbnailUrl}
            alt=""
            loading={priority === 'lazy' ? 'lazy' : undefined}
            fetchPriority={priority === 'lcp' ? 'high' : undefined}
            decoding="async"
            className="meme-card-image"
          />
          <img
            src={buildVideoPreviewUrl(meme.video.bunnyId)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="meme-card-preview"
          />
          <span className="meme-card-badges">
            {isNew ? (
              <span className="meme-card-badge meme-card-badge-new">
                {m.meme_new_badge()}
              </span>
            ) : null}
            {isPortrait ? (
              <span className="meme-card-badge" title={m.meme_format_mobile()}>
                <Smartphone aria-hidden="true" />
                <span className="sr-only">{m.meme_format_mobile()}</span>
              </span>
            ) : null}
          </span>
          <span className="meme-card-badge meme-card-duration">
            {formatClockDuration(meme.video.duration, locale)}
          </span>
        </div>
        <TitleTag className="meme-card-title">
          <Link
            to="/memes/$memeId"
            params={{ memeId: meme.id }}
            className="meme-card-link"
            onClick={handleTrackClick}
          >
            <MemeHighlightedTitle
              title={meme.title}
              highlightedTitle={meme.highlightedTitle}
            />
          </Link>
        </TitleTag>
        <p className="meme-card-meta">
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
