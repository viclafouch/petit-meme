import type { HighlightResultOption, Hit } from '@algolia/client-search'
import { searchClient } from '@algolia/client-search'
import { recommendClient } from '@algolia/recommend'
import * as Sentry from '@sentry/tanstackstart-react'
import type { MemeAlgoliaData } from '~/constants/meme'
import { MINUTE } from '~/constants/time'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
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
import { locales } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'

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
  clientEnv.VITE_ALGOLIA_SEARCH_KEY
)

export const algoliaAdminClient = searchClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_ADMIN_KEY
)

export const algoliaRecommendClient = recommendClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_SEARCH_KEY
)

export async function safeAlgoliaOp<T>(promise: Promise<T>) {
  try {
    return await promise
  } catch (error) {
    algoliaLogger.error({ err: error }, 'Algolia operation failed')
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
  attributesToSnippet: [] as string[]
}

export const ALGOLIA_ADMIN_SEARCH_PARAMS = {
  attributesToRetrieve: [
    '*',
    '-createdAtTime',
    '-publishedAtTime',
    '-imageURL'
  ],
  attributesToSnippet: [] as string[]
}

const ALGOLIA_CACHE_TTL = 5 * MINUTE
const ALGOLIA_CACHE_MAX_SIZE = 200
const ALGOLIA_CACHE_SWEEP_INTERVAL = 10 * MINUTE

type AlgoliaCacheEntry = {
  data: unknown
  expiresAt: number
}

const algoliaResultsCache = new Map<string, AlgoliaCacheEntry>()
const algoliaPendingRequests = new Map<string, Promise<unknown>>()

const sweepInterval = setInterval(() => {
  const now = Date.now()

  for (const [key, entry] of algoliaResultsCache) {
    if (entry.expiresAt <= now) {
      algoliaResultsCache.delete(key)
    }
  }
}, ALGOLIA_CACHE_SWEEP_INTERVAL)

sweepInterval.unref()

export function invalidateAlgoliaCache() {
  algoliaResultsCache.clear()
}

export async function withAlgoliaCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = ALGOLIA_CACHE_TTL
): Promise<T> {
  const cached = algoliaResultsCache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }

  const pending = algoliaPendingRequests.get(key)

  if (pending) {
    return pending as Promise<T>
  }

  const promise = fn()
    .then((data) => {
      if (algoliaResultsCache.size >= ALGOLIA_CACHE_MAX_SIZE) {
        const oldestKey = algoliaResultsCache.keys().next().value

        if (oldestKey !== undefined) {
          algoliaResultsCache.delete(oldestKey)
        }
      }

      algoliaResultsCache.set(key, {
        data,
        expiresAt: Date.now() + ttl
      })

      return data
    })
    .finally(() => {
      algoliaPendingRequests.delete(key)
    })

  algoliaPendingRequests.set(key, promise)

  return promise
}

export type AlgoliaMemeRecord = ReturnType<typeof memeToAlgoliaRecord>

export function getHighlightedTitle(hit: Hit<AlgoliaMemeRecord>) {
  const result = hit._highlightResult?.title as
    | HighlightResultOption
    | undefined

  return result?.matchLevel !== 'none' ? result?.value : undefined
}

export function normalizeAlgoliaHit(hit: AlgoliaMemeRecord): AlgoliaMemeRecord {
  return {
    ...hit,
    contentLocale: hit.contentLocale ?? MemeContentLocale.FR,
    createdAt: new Date(hit.createdAt),
    updatedAt: new Date(hit.updatedAt),
    publishedAt: hit.publishedAt ? new Date(hit.publishedAt) : null
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
        const { taskID } = await algoliaAdminClient.saveObject({
          indexName,
          body: memeToAlgoliaRecord(meme, locale)
        })

        return algoliaAdminClient.waitForTask({ indexName, taskID })
      }

      const { taskID } = await algoliaAdminClient.deleteObject({
        indexName,
        objectID: meme.id
      })

      return algoliaAdminClient.waitForTask({ indexName, taskID })
    })
  )
}

export async function deleteMemeFromAllIndices(objectID: string) {
  await Promise.all(
    locales.map(async (locale) => {
      const indexName = resolveAlgoliaIndexName(locale)
      const { taskID } = await algoliaAdminClient.deleteObject({
        indexName,
        objectID
      })

      return algoliaAdminClient.waitForTask({ indexName, taskID })
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

      await algoliaAdminClient.replaceAllObjects({
        indexName: resolveAlgoliaIndexName(locale),
        objects: records
      })

      return { locale, count: records.length }
    })
  )
}
