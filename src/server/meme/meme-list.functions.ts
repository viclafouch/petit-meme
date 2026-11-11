import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import {
  MEMES_FILTERS_SCHEMA,
  MEMES_PER_PAGE,
  NEWS_CATEGORY_SLUG,
  POPULAR_CATEGORY_SLUG,
  RECOMMEND_RELATED_CACHE_TTL,
  RECOMMEND_TRENDING_CACHE_TTL,
  RELATED_MEMES_COUNT,
  TRENDING_CATEGORY_SLUG,
  TRENDING_MEMES_COUNT,
  VIRTUAL_CATEGORY_SLUGS
} from '~/constants/meme'
import { THIRTY_DAYS_MS } from '~/constants/time'
import {
  MemeContentLocale as MemeContentLocaleEnum,
  MemeStatus,
  type MemeContentLocale
} from '~/db/generated/prisma/enums'
import {
  parseContentLocalesParam,
  resolveVisibleContentLocales,
  VISIBLE_CONTENT_LOCALES
} from '~/helpers/i18n-content'
import { algoliaLogger } from '~/lib/logger'
import { baseLocale, getLocale, type Locale } from '~/paraglide/runtime'
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

type ResolveSearchIndexParams = {
  category: string | undefined
  hasQuery: boolean
  locale: Locale
  contentLocales: MemeContentLocale[] | undefined
}

type ListTrendingCategoryMemesParams = {
  locale: Locale
  contentLocales: MemeContentLocale[] | undefined
  contentLocalesParam: string | undefined
  query: string | undefined
  page: number
}

const resolveEffectiveLocale = (
  locale: Locale,
  contentLocales: MemeContentLocale[] | undefined
) => {
  return contentLocales?.includes(MemeContentLocaleEnum.FR)
    ? baseLocale
    : locale
}

const resolveSearchIndex = ({
  category,
  hasQuery,
  locale,
  contentLocales
}: ResolveSearchIndexParams) => {
  const effectiveLocale = resolveEffectiveLocale(locale, contentLocales)

  if (hasQuery) {
    return resolveAlgoliaIndexName(effectiveLocale)
  }

  if (category === POPULAR_CATEGORY_SLUG) {
    return resolveAlgoliaReplicaPopular(effectiveLocale)
  }

  if (category === NEWS_CATEGORY_SLUG) {
    return resolveAlgoliaReplicaRecent(effectiveLocale)
  }

  return resolveAlgoliaIndexName(effectiveLocale)
}

const buildSearchFilters = (
  category: string | undefined,
  contentLocales: MemeContentLocale[] | undefined
) => {
  const filters = [buildAlgoliaPublishedFilter(contentLocales)]

  if (category === NEWS_CATEGORY_SLUG) {
    filters.push(`publishedAtTime >= ${Date.now() - THIRTY_DAYS_MS}`)
  } else if (category && !VIRTUAL_CATEGORY_SLUGS.has(category)) {
    filters.push(`categorySlugs:"${category}"`)
  }

  return filters.join(' AND ')
}

const listTrendingCategoryMemes = async ({
  locale,
  contentLocales,
  contentLocalesParam,
  query,
  page
}: ListTrendingCategoryMemesParams) => {
  const firstPageIds = await findTrendingFirstPageIds(
    resolveVisibleContentLocales(locale, contentLocales)
  )
  const filters = [
    buildAlgoliaPublishedFilter(contentLocales),
    buildAlgoliaExclusionFilter(firstPageIds)
  ]
    .filter(Boolean)
    .join(' AND ')
  const indexName = resolveAlgoliaIndexName(
    resolveEffectiveLocale(locale, contentLocales)
  )

  if (page <= 1) {
    const [memes, remainingCount] = await Promise.all([
      findMemesInOrder(firstPageIds, locale),
      countMemes({ indexName, filters })
    ])

    return {
      memes,
      query,
      queryID: undefined,
      page: 0,
      totalPages: 1 + Math.ceil(remainingCount / MEMES_PER_PAGE)
    }
  }

  const trendingPage = await searchMemes({
    cacheKey: `trending-page:${indexName}:${page}:${contentLocalesParam ?? ''}`,
    indexName,
    query: '',
    page: page - 2,
    hitsPerPage: MEMES_PER_PAGE,
    filters,
    userToken: readConsentedAlgoliaUserToken()
  })

  return {
    memes: trendingPage.memes,
    query,
    queryID: trendingPage.queryID,
    page: trendingPage.page + 1,
    totalPages: trendingPage.totalPages + 1
  }
}

export const listMemes = createServerFn({ method: 'GET' })
  .validator(MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const locale = getLocale()
    const hasQuery = Boolean(data.query)
    const contentLocales = !data.contentLocales
      ? undefined
      : parseContentLocalesParam(data.contentLocales, locale)

    if (data.category === TRENDING_CATEGORY_SLUG && !hasQuery) {
      return listTrendingCategoryMemes({
        locale,
        contentLocales,
        contentLocalesParam: data.contentLocales,
        query: data.query,
        page: data.page ?? 1
      })
    }

    const indexName = resolveSearchIndex({
      category: data.category,
      hasQuery,
      locale,
      contentLocales
    })

    const searchPage = await searchMemes({
      cacheKey: `${indexName}:${data.query ?? ''}:${data.page ?? 1}:${data.category ?? ''}:${data.contentLocales ?? ''}`,
      indexName,
      query: data.query,
      page: data.page === undefined || data.page === 0 ? 0 : data.page - 1,
      hitsPerPage: MEMES_PER_PAGE,
      filters: buildSearchFilters(data.category, contentLocales),
      userToken: readConsentedAlgoliaUserToken(),
      isHighlighted: hasQuery
    })

    return {
      memes: searchPage.memes,
      query: data.query,
      queryID: searchPage.queryID,
      page: searchPage.page,
      totalPages: searchPage.totalPages
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

export const listRelatedMemes = createServerFn({ method: 'GET' })
  .validator(z.object({ memeId: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    const locale = getLocale()

    try {
      return await recommendMemes({
        cacheKey: `related:${locale}:${data.memeId}`,
        ttl: RECOMMEND_RELATED_CACHE_TTL,
        indexName: resolveAlgoliaIndexName(locale),
        model: 'related-products',
        objectID: data.memeId,
        fallbackQuery: data.title,
        maxRecommendations: RELATED_MEMES_COUNT,
        filters: buildAlgoliaPublishedFilter(VISIBLE_CONTENT_LOCALES[locale])
      })
    } catch {
      algoliaLogger.warn('Related-products recommendation unavailable')

      return []
    }
  })

export const listTrendingMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const locale = getLocale()
    const visibleLocales = VISIBLE_CONTENT_LOCALES[locale]

    try {
      const memes = await recommendMemes({
        cacheKey: `trending:${locale}`,
        ttl: RECOMMEND_TRENDING_CACHE_TTL,
        indexName: resolveAlgoliaIndexName(locale),
        model: 'trending-items',
        maxRecommendations: TRENDING_MEMES_COUNT,
        filters: buildAlgoliaPublishedFilter(visibleLocales)
      })

      if (memes.length > 0) {
        return memes
      }
    } catch {
      algoliaLogger.warn('Trending-items recommendation unavailable')
    }

    return findMostViewedMemes({ locale, visibleLocales })
  }
)
