import { z } from 'zod'
import {
  type HighlightResult,
  type HighlightResultOption,
  type Hit,
  searchClient
} from '@algolia/client-search'
import { recommendClient } from '@algolia/recommend'
import * as Sentry from '@sentry/tanstackstart-react'
import {
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT,
  ALGOLIA_WAIT_ON_RATE_LIMIT
} from '~/constants/algolia'
import type { MemeAlgoliaData } from '~/constants/meme'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import { clientEnv } from '~/env/client'
import { serverEnv } from '~/env/server'
import {
  CONTENT_LOCALE_TO_SITE_LOCALES,
  resolveCategoryTranslation,
  resolveMemeTranslation,
  VISIBLE_CONTENT_LOCALES
} from '~/helpers/i18n-content'
import { buildVideoImageUrl } from '~/lib/bunny'
import { algoliaLogger } from '~/lib/logger'
import { locales, type Locale } from '~/paraglide/runtime'

export const algoliaIndexPrefix = clientEnv.VITE_ALGOLIA_INDEX

export function resolveAlgoliaIndexName(locale: Locale) {
  return `${algoliaIndexPrefix}_${locale}`
}

export function resolveAlgoliaReplicaPopular(locale: Locale) {
  return `${algoliaIndexPrefix}_${locale}_replica_popular`
}

export function resolveAlgoliaReplicaRecent(locale: Locale) {
  return `${algoliaIndexPrefix}_${locale}_replica_recent`
}

export function resolveAlgoliaReplicaCreated(locale: Locale) {
  return `${algoliaIndexPrefix}_${locale}_replica_created`
}

export const algoliaSearchClient = searchClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_SEARCH_KEY,
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
)

let algoliaAdminClient: ReturnType<typeof searchClient> | null = null

export const getAlgoliaAdminClient = () => {
  algoliaAdminClient ??= searchClient(
    clientEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_ADMIN_KEY,
    ALGOLIA_WAIT_ON_RATE_LIMIT
  )

  return algoliaAdminClient
}

export const algoliaRecommendClient = recommendClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_SEARCH_KEY,
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
)

export async function safeAlgoliaOp<TResult>(promise: Promise<TResult>) {
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

export function getHighlightedTitle(hit: Hit<AlgoliaMemeRecord>) {
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

export function normalizeAlgoliaHit<THit extends AlgoliaMemeHitFields>(
  hit: THit
) {
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

export function normalizeAlgoliaMemesPage(
  page: z.output<typeof ALGOLIA_MEMES_PAGE_SCHEMA>
) {
  return {
    ...page,
    memes: page.memes.map(normalizeAlgoliaHit)
  }
}

export function memeToAlgoliaRecord(meme: MemeAlgoliaData, locale: Locale) {
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

export async function syncMemeToAllIndices(meme: MemeAlgoliaData) {
  const targetLocales = CONTENT_LOCALE_TO_SITE_LOCALES[meme.contentLocale]

  await Promise.all(
    locales.map(async (locale) => {
      const indexName = resolveAlgoliaIndexName(locale)

      if (targetLocales.includes(locale)) {
        const { taskID } = await getAlgoliaAdminClient().saveObject({
          indexName,
          body: memeToAlgoliaRecord(meme, locale)
        })

        return getAlgoliaAdminClient().waitForTask({ indexName, taskID })
      }

      const { taskID } = await getAlgoliaAdminClient().deleteObject({
        indexName,
        objectID: meme.id
      })

      return getAlgoliaAdminClient().waitForTask({ indexName, taskID })
    })
  )
}

export async function deleteMemeFromAllIndices(objectID: string) {
  await Promise.all(
    locales.map(async (locale) => {
      const indexName = resolveAlgoliaIndexName(locale)
      const { taskID } = await getAlgoliaAdminClient().deleteObject({
        indexName,
        objectID
      })

      return getAlgoliaAdminClient().waitForTask({ indexName, taskID })
    })
  )
}

export async function replaceAllIndicesWithMemes(memes: MemeAlgoliaData[]) {
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
