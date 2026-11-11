import { z } from 'zod'
import { insightsClient } from '@algolia/client-insights'
import {
  type HighlightResult,
  type HighlightResultOption,
  type Hit,
  searchClient
} from '@algolia/client-search'
import { recommendClient } from '@algolia/recommend'
import * as Sentry from '@sentry/tanstackstart-react'
import { getCookie } from '@tanstack/react-start/server'
import {
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT,
  ALGOLIA_WAIT_ON_RATE_LIMIT
} from '~/constants/algolia'
import { COOKIE_ALGOLIA_USER_TOKEN_KEY } from '~/constants/cookie'
import type { MemeAlgoliaData } from '~/constants/meme'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import {
  CONTENT_LOCALE_TO_SITE_LOCALES,
  contentLocalesWithUniversal,
  resolveCategoryTranslation,
  resolveMemeTranslation,
  VISIBLE_CONTENT_LOCALES
} from '~/helpers/i18n-content'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { matchIsAnalyticsConsentGiven } from '~/lib/cookie-consent'
import { algoliaLogger } from '~/lib/logger'
import { locales, type Locale } from '~/paraglide/runtime'

export const getAlgoliaIndexPrefix = () => {
  return serverEnv.VITE_ALGOLIA_INDEX
}

export const resolveAlgoliaIndexName = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}`
}

export const resolveAlgoliaReplicaPopular = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_popular`
}

export const resolveAlgoliaReplicaRecent = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_recent`
}

export const resolveAlgoliaReplicaCreated = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_created`
}

let algoliaSearchClient: ReturnType<typeof searchClient> | null = null

export const getAlgoliaSearchClient = () => {
  algoliaSearchClient ??= searchClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_SEARCH_KEY,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaSearchClient
}

let algoliaAdminClient: ReturnType<typeof searchClient> | null = null

export const getAlgoliaAdminClient = () => {
  algoliaAdminClient ??= searchClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_ADMIN_KEY,
    ALGOLIA_WAIT_ON_RATE_LIMIT
  )

  return algoliaAdminClient
}

let algoliaRecommendClient: ReturnType<typeof recommendClient> | null = null

export const getAlgoliaRecommendClient = () => {
  algoliaRecommendClient ??= recommendClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_SEARCH_KEY,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaRecommendClient
}

let algoliaInsightsClient: ReturnType<typeof insightsClient> | null = null

export const getAlgoliaInsightsClient = () => {
  algoliaInsightsClient ??= insightsClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_ADMIN_KEY,
    undefined,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaInsightsClient
}

export const readConsentedAlgoliaUserToken = () => {
  return matchIsAnalyticsConsentGiven()
    ? getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)
    : undefined
}

export const buildAlgoliaContentLocaleFilter = (
  contentLocales: MemeContentLocale[]
) => {
  return `(${contentLocales
    .map((contentLocale) => {
      return `contentLocale:${contentLocale}`
    })
    .join(' OR ')})`
}

export const buildAlgoliaPublishedFilter = (
  contentLocales: MemeContentLocale[] | undefined
) => {
  const filters = [`status:${MemeStatus.PUBLISHED}`]

  if (contentLocales) {
    filters.push(
      buildAlgoliaContentLocaleFilter(
        contentLocalesWithUniversal(contentLocales)
      )
    )
  }

  return filters.join(' AND ')
}

export const buildAlgoliaExclusionFilter = (ids: string[]) => {
  return ids
    .map((id) => {
      return `NOT objectID:${id}`
    })
    .join(' AND ')
}

export const safeAlgoliaOp = async <TResult>(promise: Promise<TResult>) => {
  try {
    return await promise
  } catch (error) {
    algoliaLogger.error({ error }, 'Algolia operation failed')
    Sentry.captureException(error)

    return null
  }
}

export const ALGOLIA_SEARCH_RETRIEVE = [
  '*',
  '-categoryTitles',
  '-categoryKeywords',
  '-categorySlugs',
  '-categoryCount',
  '-createdAtTime',
  '-publishedAtTime',
  '-imageURL'
] as const satisfies readonly string[]

export const ALGOLIA_SEARCH_PARAMS_BASE = {
  attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE],
  attributesToSnippet: [] satisfies string[]
}

export const ALGOLIA_ADMIN_SEARCH_PARAMS = {
  attributesToRetrieve: [
    '*',
    '-createdAtTime',
    '-publishedAtTime',
    '-imageURL'
  ],
  attributesToSnippet: [] satisfies string[]
}

export type AlgoliaMemeRecord = ReturnType<typeof memeToAlgoliaRecord>

const matchIsHighlightResultOption = (
  highlight: HighlightResult
): highlight is HighlightResultOption => {
  return !Array.isArray(highlight) && typeof highlight.matchLevel === 'string'
}

export const getHighlightedTitle = (hit: Hit<AlgoliaMemeRecord>) => {
  const titleHighlight = hit._highlightResult?.title
  const isTitleMatched =
    titleHighlight !== undefined &&
    matchIsHighlightResultOption(titleHighlight) &&
    titleHighlight.matchLevel !== 'none'

  return isTitleMatched ? titleHighlight.value : undefined
}

const ALGOLIA_MEME_HIT_SCHEMA = z.object({
  objectID: z.string(),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  contentLocale: z.enum(MemeContentLocale).optional(),
  status: z.enum(MemeStatus),
  viewCount: z.number(),
  shareCount: z.number(),
  downloadCount: z.number(),
  tweetUrl: z.string().nullable(),
  videoId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  video: z.object({
    id: z.number(),
    bunnyId: z.string(),
    duration: z.number(),
    bunnyStatus: z.number()
  })
})

export const parseAlgoliaMemeHit = (hit: unknown) => {
  const parsedHit = ALGOLIA_MEME_HIT_SCHEMA.safeParse(hit)

  if (!parsedHit.success) {
    algoliaLogger.warn(
      { issues: parsedHit.error.issues },
      'Algolia hit does not match the meme schema'
    )

    return null
  }

  return parsedHit.data
}

export const parseAlgoliaMemeHits = (hits: unknown[]) => {
  return hits.flatMap((hit) => {
    const meme = parseAlgoliaMemeHit(hit)

    return meme ? [meme] : []
  })
}

export const ALGOLIA_MEMES_PAGE_SCHEMA = z.object({
  memes: z.array(
    ALGOLIA_MEME_HIT_SCHEMA.extend({ highlightedTitle: z.string().optional() })
  ),
  query: z.string().optional(),
  queryID: z.string().optional(),
  page: z.number().optional(),
  totalPages: z.number().optional()
})

type AlgoliaMemeHitFields = {
  contentLocale?: MemeContentLocale
  createdAt: string | Date
  updatedAt: string | Date
  publishedAt: string | Date | null
}

export const normalizeAlgoliaHit = <THit extends AlgoliaMemeHitFields>(
  hit: THit
) => {
  return {
    ...hit,
    contentLocale: hit.contentLocale ?? MemeContentLocale.FR,
    createdAt: new Date(hit.createdAt),
    updatedAt: new Date(hit.updatedAt),
    publishedAt:
      hit.publishedAt === null || hit.publishedAt === ''
        ? null
        : new Date(hit.publishedAt)
  }
}

export const normalizeAlgoliaMemesPage = (
  page: z.output<typeof ALGOLIA_MEMES_PAGE_SCHEMA>
) => {
  return {
    ...page,
    memes: page.memes.map(normalizeAlgoliaHit)
  }
}

export const memeToAlgoliaRecord = (meme: MemeAlgoliaData, locale: Locale) => {
  const resolved = resolveMemeTranslation({
    translations: meme.translations,
    contentLocale: meme.contentLocale,
    requestedLocale: locale,
    fallback: meme
  })

  const resolvedCategories = meme.categories.map(({ category }) => {
    return {
      slug: category.slug,
      ...resolveCategoryTranslation({
        translations: category.translations,
        requestedLocale: locale,
        fallback: category
      })
    }
  })

  return {
    objectID: meme.id,
    id: meme.id,
    title: resolved.title,
    description: resolved.description,
    keywords: resolved.keywords,
    contentLocale: meme.contentLocale,
    status: meme.status,
    viewCount: meme.viewCount,
    shareCount: meme.shareCount,
    downloadCount: meme.downloadCount,
    tweetUrl: meme.tweetUrl,
    videoId: meme.videoId,
    createdAt: meme.createdAt,
    updatedAt: meme.updatedAt,
    publishedAt: meme.publishedAt,
    video: {
      id: meme.video.id,
      bunnyId: meme.video.bunnyId,
      duration: meme.video.duration,
      bunnyStatus: meme.video.bunnyStatus
    },
    categoryTitles: resolvedCategories.map(({ title }) => {
      return title
    }),
    categoryKeywords: resolvedCategories.map(({ keywords }) => {
      return keywords
    }),
    categorySlugs: resolvedCategories.map(({ slug }) => {
      return slug
    }),
    categoryCount: meme.categories.length,
    imageURL: buildVideoImageUrl(meme.video.bunnyId),
    createdAtTime: meme.createdAt.getTime(),
    publishedAtTime: meme.publishedAt?.getTime()
  }
}

const deleteFromIndex = async (indexName: string, objectID: string) => {
  const { taskID } = await getAlgoliaAdminClient().deleteObject({
    indexName,
    objectID
  })

  return getAlgoliaAdminClient().waitForTask({ indexName, taskID })
}

export const syncMemeToAllIndices = async (meme: MemeAlgoliaData) => {
  const targetLocales = CONTENT_LOCALE_TO_SITE_LOCALES[meme.contentLocale]

  await Promise.all(
    locales.map(async (locale) => {
      const indexName = resolveAlgoliaIndexName(locale)

      if (!targetLocales.includes(locale)) {
        return deleteFromIndex(indexName, meme.id)
      }

      const { taskID } = await getAlgoliaAdminClient().saveObject({
        indexName,
        body: memeToAlgoliaRecord(meme, locale)
      })

      return getAlgoliaAdminClient().waitForTask({ indexName, taskID })
    })
  )
}

export const deleteMemeFromAllIndices = async (objectID: string) => {
  await Promise.all(
    locales.map((locale) => {
      return deleteFromIndex(resolveAlgoliaIndexName(locale), objectID)
    })
  )
}

export const replaceAllIndicesWithMemes = async (memes: MemeAlgoliaData[]) => {
  return Promise.all(
    locales.map(async (locale) => {
      const visibleLocales = VISIBLE_CONTENT_LOCALES[locale]
      const records = memes
        .filter((meme) => {
          return visibleLocales.includes(meme.contentLocale)
        })
        .map((meme) => {
          return memeToAlgoliaRecord(meme, locale)
        })

      await getAlgoliaAdminClient().replaceAllObjects({
        indexName: resolveAlgoliaIndexName(locale),
        objects: records
      })

      return { locale, count: records.length }
    })
  )
}
