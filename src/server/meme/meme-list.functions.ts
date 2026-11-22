import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import {
  MEMES_FILTERS_SCHEMA,
  MEMES_PER_PAGE,
  RECOMMEND_RELATED_CACHE_TTL,
  RECOMMEND_TRENDING_CACHE_TTL,
  RELATED_MEMES_COUNT,
  TRENDING_MEMES_COUNT,
  type MemesSort
} from '~/constants/meme'
import { THIRTY_DAYS_MS } from '~/constants/time'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { VISIBLE_CONTENT_LOCALES } from '~/helpers/i18n-content'
import { resolveMemesSort } from '~/helpers/memes-sort'
import { algoliaLogger } from '~/lib/logger'
import { getLocale, type Locale } from '~/paraglide/runtime'
import {
  countMemes,
  recommendMemes,
  searchMemes
} from '~/server/meme/meme-index.server'
import {
  findMemesInOrder,
  findMostViewedMemes,
  findTrendingFirstPageIds
} from '~/server/meme/trending.server'
import {
  buildAlgoliaExclusionFilter,
  buildAlgoliaPublishedFilter,
  readConsentedAlgoliaUserToken,
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaPopular,
  resolveAlgoliaReplicaRecent,
  safeAlgoliaOp
} from '~/server/platforms/algolia.server'

const SORT_INDEX_RESOLVERS = {
  relevance: resolveAlgoliaIndexName,
  trending: resolveAlgoliaIndexName,
  new: resolveAlgoliaReplicaRecent,
  popular: resolveAlgoliaReplicaPopular
} as const satisfies Record<MemesSort, (locale: Locale) => string>

const buildCategoryFilters = (category: string | undefined) => {
  const filters = [buildAlgoliaPublishedFilter()]

  if (category) {
    filters.push(`categorySlugs:"${category}"`)
  }

  return filters.join(' AND ')
}

const listTrendingMemesPage = async (locale: Locale, page: number) => {
  const firstPageIds = await findTrendingFirstPageIds(
    VISIBLE_CONTENT_LOCALES[locale]
  )
  const indexName = resolveAlgoliaIndexName(locale)
  const filters = [
    buildAlgoliaPublishedFilter(),
    buildAlgoliaExclusionFilter(firstPageIds)
  ]
    .filter(Boolean)
    .join(' AND ')

  if (page <= 1) {
    const [memes, remainingCount] = await Promise.all([
      findMemesInOrder(firstPageIds, locale),
      countMemes({
        cacheKey: `trending-remaining:${indexName}`,
        indexName,
        filters
      })
    ])

    return {
      memes,
      queryID: undefined,
      page: 1,
      total: firstPageIds.length + remainingCount,
      hasNextPage: remainingCount > 0
    }
  }

  const trendingPage = await searchMemes({
    cacheKey: `trending-page:${indexName}:${page}`,
    indexName,
    query: '',
    page: page - 2,
    hitsPerPage: MEMES_PER_PAGE,
    filters,
    userToken: readConsentedAlgoliaUserToken()
  })

  return {
    memes: trendingPage.memes,
    queryID: trendingPage.queryID,
    page,
    total: firstPageIds.length + trendingPage.totalHits,
    hasNextPage: page - 1 < trendingPage.totalPages
  }
}

export const listMemes = createServerFn({ method: 'GET' })
  .validator(MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const locale = getLocale()
    const page = data.page ?? 1
    const sort = resolveMemesSort(data)

    if (sort === 'trending' && !data.query && !data.category) {
      return listTrendingMemesPage(locale, page)
    }

    const indexName = SORT_INDEX_RESOLVERS[sort](locale)
    const searchPage = await searchMemes({
      cacheKey: `${indexName}:${data.query ?? ''}:${page}:${data.category ?? ''}`,
      indexName,
      query: data.query,
      page: page - 1,
      hitsPerPage: MEMES_PER_PAGE,
      filters: buildCategoryFilters(data.category),
      userToken: readConsentedAlgoliaUserToken(),
      isHighlighted: Boolean(data.query)
    })

    return {
      memes: searchPage.memes,
      queryID: searchPage.queryID,
      page,
      total: searchPage.totalHits,
      hasNextPage: page < searchPage.totalPages
    }
  })

export const countRecentMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const locale = getLocale()

    const recentMemesCount = await safeAlgoliaOp(
      countMemes({
        cacheKey: `recent-count:${locale}`,
        indexName: resolveAlgoliaIndexName(locale),
        filters: [
          `status:${MemeStatus.PUBLISHED}`,
          `publishedAtTime >= ${Date.now() - THIRTY_DAYS_MS}`
        ].join(' AND ')
      })
    )

    return recentMemesCount ?? 0
  }
)

type FetchTrendingMemesParams = {
  locale: Locale
  count: number
}

const fetchTrendingMemes = async ({
  locale,
  count
}: FetchTrendingMemesParams) => {
  const visibleLocales = VISIBLE_CONTENT_LOCALES[locale]

  try {
    const memes = await recommendMemes({
      cacheKey: `trending:${locale}:${count}`,
      ttl: RECOMMEND_TRENDING_CACHE_TTL,
      indexName: resolveAlgoliaIndexName(locale),
      model: 'trending-items',
      maxRecommendations: count,
      filters: buildAlgoliaPublishedFilter(visibleLocales)
    })

    if (memes.length > 0) {
      return memes
    }
  } catch {
    algoliaLogger.warn('Trending-items recommendation unavailable')
  }

  return findMostViewedMemes({ locale, visibleLocales, count })
}

type FetchRelatedMemesParams = {
  locale: Locale
  memeId: string
  title: string
}

const fetchRelatedMemes = async ({
  locale,
  memeId,
  title
}: FetchRelatedMemesParams) => {
  try {
    return await recommendMemes({
      cacheKey: `related:${locale}:${memeId}:${RELATED_MEMES_COUNT}`,
      ttl: RECOMMEND_RELATED_CACHE_TTL,
      indexName: resolveAlgoliaIndexName(locale),
      model: 'related-products',
      objectID: memeId,
      fallbackQuery: title,
      maxRecommendations: RELATED_MEMES_COUNT,
      filters: buildAlgoliaPublishedFilter(VISIBLE_CONTENT_LOCALES[locale])
    })
  } catch {
    algoliaLogger.warn('Related-products recommendation unavailable')

    return []
  }
}

const readStrings = (value: unknown) => {
  return Array.isArray(value)
    ? value.filter((item): item is string => {
        return typeof item === 'string'
      })
    : []
}

const readMemeCategories = (meme: object) => {
  return {
    categoryTitles: readStrings(
      'categoryTitles' in meme ? meme.categoryTitles : undefined
    ),
    categorySlugs: readStrings(
      'categorySlugs' in meme ? meme.categorySlugs : undefined
    )
  }
}

const fetchTrendingTopUp = async (locale: Locale) => {
  try {
    const trendingMemes = await fetchTrendingMemes({
      locale,
      count: RELATED_MEMES_COUNT
    })

    return trendingMemes.map((meme) => {
      return { ...meme, ...readMemeCategories(meme) }
    })
  } catch {
    algoliaLogger.warn('Trending top-up of related Memes unavailable')

    return []
  }
}

export const listRelatedMemes = createServerFn({ method: 'GET' })
  .validator(z.object({ memeId: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    const locale = getLocale()
    const relatedMemes = await fetchRelatedMemes({ locale, ...data })

    if (relatedMemes.length >= RELATED_MEMES_COUNT) {
      return relatedMemes
    }

    const takenIds = new Set([
      data.memeId,
      ...relatedMemes.map((meme) => {
        return meme.id
      })
    ])
    const topUpMemes = await fetchTrendingTopUp(locale)

    return [
      ...relatedMemes,
      ...topUpMemes.filter((meme) => {
        return !takenIds.has(meme.id)
      })
    ].slice(0, RELATED_MEMES_COUNT)
  })

export const listTrendingMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    return fetchTrendingMemes({
      locale: getLocale(),
      count: TRENDING_MEMES_COUNT
    })
  }
)
