import React from 'react'
import { Search } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { MemeLanguageBadge } from '~/components/meme/meme-language-badge'
import { useMediaSession } from '~/components/meme/use-media-session'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { useRegisterMemeView } from '~/components/meme/use-register-meme-view'
import type { MemeDerivedFormat } from '~/constants/bunny'
import { TRENDING_CATEGORY_SLUG, type MemeExportMode } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { formatDate, formatRelativeTime } from '~/helpers/date'
import { formatCount } from '~/helpers/number'
import { buildVideoFirstFrameUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getMemeQueryOpts } from '~/queries/meme'
import {
  applyBreakUiMeme,
  useBreakUiDataset
} from '~/routes/_public__root/memes/-lib/break-ui-fixtures'
import { getCategoryHue } from '~/routes/_public__root/memes/-lib/category-hue'
import { getVideoAspectRatio } from '~/routes/_public__root/memes/-lib/video-aspect-ratio'
import type { getMeme } from '~/server/meme/meme.functions'
import { BreakUiToggle } from './break-ui-toggle'
import { MemeActions } from './meme-actions'
import { MemePendingBanner } from './meme-pending-banner'
import { MemeWatchPlayer } from './meme-watch-player'
import { RelatedMemesRail } from './related-memes-rail'

const memeRouteApi = getRouteApi('/_public__root/memes/$memeId')

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'long' }

type WatchedMeme = Awaited<ReturnType<typeof getMeme>>

type MemeMetaProps = {
  meme: WatchedMeme
  now: number
}

const MemeMeta = ({ meme, now }: MemeMetaProps) => {
  const locale = getLocale()
  const publishedAt = meme.publishedAt ? new Date(meme.publishedAt) : null

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>
        {m.meme_views({
          count: meme.viewCount,
          formattedCount: formatCount(meme.viewCount, locale, 'standard')
        })}
      </span>
      {publishedAt ? (
        <time
          dateTime={publishedAt.toISOString()}
          title={formatDate(publishedAt, locale, LONG_DATE_OPTIONS)}
        >
          {formatRelativeTime(publishedAt, locale, now)}
        </time>
      ) : null}
      {meme.contentLocale === 'UNIVERSAL' ? null : (
        <MemeLanguageBadge contentLocale={meme.contentLocale} showLabel />
      )}
    </p>
  )
}

type MemeTitleProps = {
  title: string
}

const MemeTitle = ({ title }: MemeTitleProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const handleToggle = () => {
    setIsExpanded((wasExpanded) => {
      return !wasExpanded
    })
  }

  return (
    <h1 className="font-bricolage text-xl leading-heading font-semibold text-balance lg:text-2xl">
      <button
        type="button"
        className="meme-title-toggle"
        aria-expanded={isExpanded}
        onClick={handleToggle}
      >
        <span className={isExpanded ? undefined : 'max-lg:line-clamp-2'}>
          {title}
        </span>
      </button>
    </h1>
  )
}

type MemeDetailsProps = {
  meme: WatchedMeme
}

const MemeDetails = ({ meme }: MemeDetailsProps) => {
  const categoryTitles = new Set(
    meme.categories.map(({ category }) => {
      return category.title.toLowerCase()
    })
  )
  const keywords = [
    ...new Set(
      meme.keywords.map((keyword) => {
        return keyword.toLowerCase()
      })
    )
  ].filter((keyword) => {
    return !categoryTitles.has(keyword)
  })

  return (
    <>
      {meme.description === '' ? null : (
        <p className="max-w-[72ch] text-sm text-pretty text-muted-foreground">
          {meme.description}
        </p>
      )}
      {meme.categories.length > 0 ? (
        <ul className="meme-tags" aria-label={m.meme_categories_label()}>
          {meme.categories.map(({ category }) => {
            return (
              <li key={category.id}>
                <Link
                  to="/memes/category/$slug"
                  params={{ slug: category.slug }}
                  className="meme-category"
                  style={{ '--hue': getCategoryHue(category.slug) }}
                >
                  {category.title}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
      {keywords.length > 0 ? (
        <ul className="meme-tags" aria-label={m.meme_related_searches()}>
          {keywords.map((keyword) => {
            return (
              <li key={keyword}>
                <Link
                  to="/memes/category/$slug"
                  params={{ slug: TRENDING_CATEGORY_SLUG }}
                  search={{ query: keyword }}
                  className="meme-keyword"
                  title={keyword}
                >
                  <Search aria-hidden="true" />
                  <span className="truncate">{keyword}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </>
  )
}

export const MemePage = () => {
  const { memeId } = memeRouteApi.useParams()
  const memeQuery = useSuspenseQuery(getMemeQueryOpts(memeId))
  const meme = applyBreakUiMeme(memeQuery.data, useBreakUiDataset())
  const { video, videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: meme.id
  })
  const shareMutation = useMemeExport({ mode: 'share' })
  const downloadMutation = useMemeExport({ mode: 'download' })

  useMediaSession({ video, isActive: true, meme })
  useRegisterMemeView({
    memeId: meme.id,
    video,
    ratio: 0.3,
    minMs: 2500,
    maxMs: 12_000
  })

  const handlePause = () => {
    video?.pause()
  }

  const handleExport = (mode: MemeExportMode, format: MemeDerivedFormat) => {
    handlePause()
    const exportMutation = mode === 'share' ? shareMutation : downloadMutation

    exportMutation.trigger(meme, format)
  }

  return (
    <div className="meme-page">
      <BreakUiToggle />
      <div className="meme-grid">
        <div className="relative isolate min-w-0">
          <div aria-hidden="true" className="meme-glow" />
          {meme.status === MemeStatus.PUBLISHED ? null : (
            <div className="px-4 pb-4 lg:px-0">
              <MemePendingBanner memeId={meme.id} />
            </div>
          )}
          <div
            className="meme-stage"
            style={{
              '--meme-video-ratio': getVideoAspectRatio(meme.video)
            }}
          >
            <div aria-hidden="true" className="meme-stage-fill">
              <img
                src={buildVideoFirstFrameUrl(meme.video.bunnyId)}
                alt=""
                decoding="async"
              />
            </div>
            <MemeWatchPlayer
              bunnyId={meme.video.bunnyId}
              title={meme.title}
              video={video}
              onVideoChange={videoCallbackRef}
              playbackFailure={playbackFailure}
            />
          </div>
          <div className="relative flex flex-col gap-4 px-4 pt-4 lg:px-0 lg:pt-5">
            <div className="meme-heading-row">
              <div className="meme-heading">
                <div className="flex min-w-0 flex-col gap-1">
                  <MemeTitle key={meme.id} title={meme.title} />
                  <MemeMeta meme={meme} now={memeQuery.dataUpdatedAt} />
                </div>
                <MemeActions
                  meme={meme}
                  isSharing={shareMutation.isPending}
                  isDownloading={downloadMutation.isPending}
                  onPause={handlePause}
                  onExport={handleExport}
                />
              </div>
            </div>
            <MemeDetails meme={meme} />
          </div>
        </div>
        <RelatedMemesRail memeId={meme.id} title={meme.title} />
      </div>
    </div>
  )
}
