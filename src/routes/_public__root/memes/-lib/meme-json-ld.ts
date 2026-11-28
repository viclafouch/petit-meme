import type { InteractionCounter, VideoObject } from 'schema-dts'
import { createIsomorphicFn } from '@tanstack/react-start'
import { HLS_MIME_TYPE } from '~/constants/bunny'
import type { MemeWithCategories, MemeWithVideo } from '~/constants/meme'
import { THUMBNAIL_RATIOS } from '~/constants/og'
import { ONE_HOUR_IN_SECONDS, SECONDS_PER_MINUTE } from '~/constants/time'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { getCrawlerStreamUrl } from '~/lib/crawler-video'
import {
  buildBreadcrumbNode,
  buildCategoryCrumb,
  serializeJsonLdGraph
} from '~/lib/seo/json-ld'
import { buildEmbedUrl, buildThumbnailUrl, buildUrl } from '~/lib/seo/url'
import { getLocale } from '~/paraglide/runtime'

const formatSchemaDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return 'PT0S'
  }

  const hours = Math.floor(totalSeconds / ONE_HOUR_IN_SECONDS)
  const minutes = Math.floor(
    (totalSeconds % ONE_HOUR_IN_SECONDS) / SECONDS_PER_MINUTE
  )
  const seconds = totalSeconds % SECONDS_PER_MINUTE

  const parts = [
    hours > 0 ? `${hours}H` : '',
    minutes > 0 ? `${minutes}M` : '',
    seconds > 0 || (hours === 0 && minutes === 0) ? `${seconds}S` : ''
  ]

  return `PT${parts.join('')}`
}

const buildWatchCounter = (viewCount: number): InteractionCounter => {
  return {
    '@type': 'InteractionCounter',
    interactionType: { '@type': 'WatchAction' },
    userInteractionCount: viewCount
  }
}

const buildThumbnailUrls = (meme: MemeWithVideo) => {
  return [
    buildVideoImageUrl(meme.video.bunnyId),
    ...THUMBNAIL_RATIOS.map((ratio) => {
      return buildThumbnailUrl(meme.id, ratio)
    })
  ]
}

export const buildVideoNode = (
  meme: MemeWithVideo,
  crawlerStreamUrl: string | null
): VideoObject => {
  const locale = getLocale()

  return {
    '@type': 'VideoObject',
    '@id': `${buildUrl(`/memes/${meme.id}`, locale)}#video`,
    name: meme.title,
    description: meme.description,
    thumbnailUrl: buildThumbnailUrls(meme),
    uploadDate: (meme.publishedAt ?? meme.createdAt).toISOString(),
    duration: formatSchemaDuration(meme.video.duration),
    embedUrl: buildEmbedUrl(meme.id, locale),
    ...(crawlerStreamUrl === null
      ? {}
      : { contentUrl: crawlerStreamUrl, encodingFormat: HLS_MIME_TYPE }),
    interactionStatistic: buildWatchCounter(meme.viewCount),
    inLanguage: locale
  }
}

export const getMemeJsonLd = createIsomorphicFn()
  .server(
    async (meme: MemeWithVideo & Pick<MemeWithCategories, 'categories'>) => {
      const crawlerStreamUrl = await getCrawlerStreamUrl(meme.video.bunnyId)

      return serializeJsonLdGraph([
        buildVideoNode(meme, crawlerStreamUrl),
        buildBreadcrumbNode([
          buildCategoryCrumb(meme.categories[0]?.category),
          { name: meme.title, pathname: `/memes/${meme.id}` }
        ])
      ])
    }
  )
  .client(async () => {
    return null
  })
