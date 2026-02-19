import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import { MINUTE } from '@/constants/time'
import { serverEnv } from '@/env/server'
import { buildVideoImageUrl } from '@/lib/bunny'
import { searchClient } from '@algolia/client-search'

export const algoliaIndexName = serverEnv.ALGOLIA_INDEX

export const algoliaSearchClient = searchClient(
  serverEnv.ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_SEARCH_KEY
)

export const algoliaAdminClient = searchClient(
  serverEnv.ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_ADMIN_KEY
)

export async function safeAlgoliaOp<T>(promise: Promise<T>) {
  try {
    return await promise
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)

    return null
  }
}

export const ALGOLIA_SEARCH_RETRIEVE = [
  '*',
  '-categoryTitles',
  '-categoryKeywords',
  '-categorySlugs',
  '-createdAtTime',
  '-publishedAtTime',
  '-imageURL'
] as const satisfies readonly string[]

export const ALGOLIA_SEARCH_PARAMS_BASE = {
  attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE],
  attributesToHighlight: [] as string[],
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

setInterval(() => {
  const now = Date.now()

  for (const [key, entry] of algoliaResultsCache) {
    if (entry.expiresAt <= now) {
      algoliaResultsCache.delete(key)
    }
  }
}, ALGOLIA_CACHE_SWEEP_INTERVAL)

export function invalidateAlgoliaCache() {
  algoliaResultsCache.clear()
}

export async function withAlgoliaCache<T>(
  key: string,
  fn: () => Promise<T>
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
        expiresAt: Date.now() + ALGOLIA_CACHE_TTL
      })

      return data
    })
    .finally(() => {
      algoliaPendingRequests.delete(key)
    })

  algoliaPendingRequests.set(key, promise)

  return promise
}

export function normalizeAlgoliaHit(hit: MemeWithVideo & MemeWithCategories) {
  return {
    ...hit,
    createdAt: new Date(hit.createdAt),
    updatedAt: new Date(hit.updatedAt),
    publishedAt: hit.publishedAt ? new Date(hit.publishedAt) : null
  } satisfies MemeWithVideo & MemeWithCategories
}

export function memeToAlgoliaRecord(meme: MemeWithVideo & MemeWithCategories) {
  const categoryTitles: string[] = []
  const categoryKeywords: string[][] = []
  const categorySlugs: string[] = []

  for (const { category } of meme.categories) {
    categoryTitles.push(category.title)
    categoryKeywords.push(category.keywords)
    categorySlugs.push(category.slug)
  }

  return {
    ...meme,
    objectID: meme.id,
    categoryTitles,
    categoryKeywords,
    categorySlugs,
    imageURL: buildVideoImageUrl(meme.video.bunnyId),
    createdAtTime: meme.createdAt.getTime(),
    publishedAtTime: meme.publishedAt?.getTime()
  }
}
