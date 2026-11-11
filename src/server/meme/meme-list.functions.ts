import { z } from 'zod'
import type { RecommendationsRequest } from '@algolia/recommend'
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
  readCachedMemeHits,
  writeRecommendCache
} from '~/server/meme/recommend-cache.server'
import {
  findMemesInOrder,
  findMostViewedMemes,
  findTrendingFirstPageIds
} from '~/server/meme/trending.server'
import { createAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import {
  ALGOLIA_MEMES_PAGE_SCHEMA,
  ALGOLIA_SEARCH_PARAMS_BASE,
  ALGOLIA_SEARCH_RETRIEVE,
  buildAlgoliaExclusionFilter,
  buildAlgoliaPublishedFilter,
  getAlgoliaRecommendClient,
  getAlgoliaSearchClient,
  getHighlightedTitle,
  normalizeAlgoliaHit,
  normalizeAlgoliaMemesPage,
  parseAlgoliaMemeHit,
  parseAlgoliaMemeHits,
  readConsentedAlgoliaUserToken,
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaPopular,
  resolveAlgoliaReplicaRecent,
  safeAlgoliaOp,
  type AlgoliaMemeRecord
} from '~/server/platforms/algolia.server'

type FetchTrendingMemesPageParams = {
  indexName: string
  algoliaPage: number
  algoliaFilters: string
  userToken: string | undefined
  query: string | undefined
}

type FetchSearchMemesPageParams = {
  indexName: string
  category: string | undefined
  contentLocales: MemeContentLocale[] | undefined
  query: string | undefined
  page: number | undefined
  userToken: string | undefined
  hasQuery: boolean
}

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

type ReadRecommendedMemesParams = {
  cacheKey: string
  ttl: number
  request: RecommendationsRequest
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

const fetchTrendingMemesPage = async ({
  indexName,
  algoliaPage,
  algoliaFilters,
  userToken,
  query
}: FetchTrendingMemesPageParams) => {
  const response =
    await getAlgoliaSearchClient().searchSingleIndex<AlgoliaMemeRecord>({
      indexName,
      searchParams: {
        query: '',
        page: algoliaPage,
        hitsPerPage: MEMES_PER_PAGE,
        filters: algoliaFilters,
        clickAnalytics: true,
        userToken,
        ...ALGOLIA_SEARCH_PARAMS_BASE
      }
    })

  return {
    memes: parseAlgoliaMemeHits(response.hits),
    query,
    queryID: response.queryID,
    page: (response.page ?? 0) + 1,
    totalPages: 1 + (response.nbPages ?? 0)
  }
}

const readTrendingMemesPage = createAlgoliaCache({
  schema: ALGOLIA_MEMES_PAGE_SCHEMA,
  fetchFresh: fetchTrendingMemesPage
})

const fetchSearchMemesPage = async ({
  indexName,
  category,
  contentLocales,
  query,
  page,
  userToken,
  hasQuery
}: FetchSearchMemesPageParams) => {
  const response =
    await getAlgoliaSearchClient().searchSingleIndex<AlgoliaMemeRecord>({
      indexName,
      searchParams: {
        query,
        page: page === undefined || page === 0 ? 0 : page - 1,
        hitsPerPage: MEMES_PER_PAGE,
        filters: buildSearchFilters(category, contentLocales),
        clickAnalytics: true,
        userToken,
        ...ALGOLIA_SEARCH_PARAMS_BASE
      }
    })

  return {
    memes: response.hits.flatMap((hit) => {
      const meme = parseAlgoliaMemeHit(hit)

      if (!meme) {
        return []
      }

      return [
        {
          ...meme,
          highlightedTitle: hasQuery ? getHighlightedTitle(hit) : undefined
        }
      ]
    }),
    query,
    queryID: response.queryID,
    page: response.page,
    totalPages: response.nbPages
  }
}

const readSearchMemesPage = createAlgoliaCache({
  schema: ALGOLIA_MEMES_PAGE_SCHEMA,
  fetchFresh: fetchSearchMemesPage
})

const fetchRecentMemesCount = async (locale: Locale) => {
  const response = await getAlgoliaSearchClient().searchSingleIndex({
    indexName: resolveAlgoliaIndexName(locale),
    searchParams: {
      filters: [
        `status:${MemeStatus.PUBLISHED}`,
        `publishedAtTime >= ${Date.now() - THIRTY_DAYS_MS}`
      ].join(' AND '),
      hitsPerPage: 0,
      attributesToRetrieve: [],
      attributesToHighlight: [],
      attributesToSnippet: []
    }
  })

  return response.nbHits ?? 0
}

const readRecentMemesCount = createAlgoliaCache({
  schema: z.number(),
  fetchFresh: fetchRecentMemesCount
})

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
  const algoliaFilters = [
    buildAlgoliaPublishedFilter(contentLocales),
    buildAlgoliaExclusionFilter(firstPageIds)
  ]
    .filter(Boolean)
    .join(' AND ')
  const indexName = resolveAlgoliaIndexName(
    resolveEffectiveLocale(locale, contentLocales)
  )

  if (page <= 1) {
    const [memes, remainingResponse] = await Promise.all([
      findMemesInOrder(firstPageIds, locale),
      getAlgoliaSearchClient().searchSingleIndex<AlgoliaMemeRecord>({
        indexName,
        searchParams: {
          query: '',
          hitsPerPage: 0,
          filters: algoliaFilters
        }
      })
    ])

    return {
      memes,
      query,
      queryID: undefined,
      page: 0,
      totalPages:
        1 + Math.ceil((remainingResponse.nbHits ?? 0) / MEMES_PER_PAGE)
    }
  }

  const trendingPage = await readTrendingMemesPage({
    key: `trending-page:${indexName}:${page}:${contentLocalesParam ?? ''}`,
    params: {
      indexName,
      algoliaPage: page - 2,
      algoliaFilters,
      userToken: readConsentedAlgoliaUserToken(),
      query
    }
  })

  return normalizeAlgoliaMemesPage(trendingPage)
}

const readRecommendedMemes = async ({
  cacheKey,
  ttl,
  request
}: ReadRecommendedMemesParams) => {
  const cachedMemes = await readCachedMemeHits(cacheKey)

  if (cachedMemes) {
    return cachedMemes
  }

  const response = await getAlgoliaRecommendClient().getRecommendations({
    requests: [request]
  })
  const memes = parseAlgoliaMemeHits(response.results[0]?.hits ?? []).map(
    normalizeAlgoliaHit
  )

  if (memes.length > 0) {
    void writeRecommendCache({ key: cacheKey, data: memes, ttl })
  }

  return memes
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

    const searchPage = await readSearchMemesPage({
      key: `${indexName}:${data.query ?? ''}:${data.page ?? 1}:${data.category ?? ''}:${data.contentLocales ?? ''}`,
      params: {
        indexName,
        category: data.category,
        contentLocales,
        query: data.query,
        page: data.page,
        userToken: readConsentedAlgoliaUserToken(),
        hasQuery
      }
    })

    return normalizeAlgoliaMemesPage(searchPage)
  })

export const countRecentMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const locale = getLocale()

    const recentMemesCount = await safeAlgoliaOp(
      readRecentMemesCount({
        key: `recent-count:${locale}`,
        params: locale
      })
    )

    return recentMemesCount ?? 0
  }
)

export const listRelatedMemes = createServerFn({ method: 'GET' })
  .validator(z.object({ memeId: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    const locale = getLocale()
    const filters = buildAlgoliaPublishedFilter(VISIBLE_CONTENT_LOCALES[locale])

    try {
      return await readRecommendedMemes({
        cacheKey: `related:${locale}:${data.memeId}`,
        ttl: RECOMMEND_RELATED_CACHE_TTL,
        request: {
          indexName: resolveAlgoliaIndexName(locale),
          model: 'related-products',
          objectID: data.memeId,
          threshold: 0,
          maxRecommendations: RELATED_MEMES_COUNT,
          queryParameters: {
            filters,
            attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE]
          },
          fallbackParameters: {
            query: data.title,
            filters
          }
        }
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
      const memes = await readRecommendedMemes({
        cacheKey: `trending:${locale}`,
        ttl: RECOMMEND_TRENDING_CACHE_TTL,
        request: {
          indexName: resolveAlgoliaIndexName(locale),
          model: 'trending-items',
          threshold: 0,
          maxRecommendations: TRENDING_MEMES_COUNT,
          queryParameters: {
            filters: buildAlgoliaPublishedFilter(visibleLocales),
            attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE]
          }
        }
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
