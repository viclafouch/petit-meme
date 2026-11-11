import { z } from 'zod'
import type {
  HighlightResult,
  HighlightResultOption,
  Hit
} from '@algolia/client-search'
import type { RecommendationsRequest } from '@algolia/recommend'
import type { MemeAlgoliaData } from '~/constants/meme'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_TO_SITE_LOCALES,
  resolveCategoryTranslation,
  resolveMemeTranslation,
  VISIBLE_CONTENT_LOCALES
} from '~/helpers/i18n-content'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { algoliaLogger } from '~/lib/logger'
import { locales, type Locale } from '~/paraglide/runtime'
import {
  readRecommendCache,
  writeRecommendCache
} from '~/server/meme/recommend-cache.server'
import { createAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import {
  getAlgoliaAdminClient,
  getAlgoliaRecommendClient,
  getAlgoliaSearchClient,
  resolveAlgoliaIndexName
} from '~/server/platforms/algolia.server'

const PUBLIC_RETRIEVE = [
  '*',
  '-categoryTitles',
  '-categoryKeywords',
  '-categorySlugs',
  '-categoryCount',
  '-createdAtTime',
  '-publishedAtTime',
  '-imageURL'
] as const satisfies readonly string[]

const PUBLIC_SEARCH_PARAMS = {
  attributesToRetrieve: [...PUBLIC_RETRIEVE],
  attributesToSnippet: [] satisfies string[]
}

const ADMIN_SEARCH_PARAMS = {
  attributesToRetrieve: [
    '*',
    '-createdAtTime',
    '-publishedAtTime',
    '-imageURL'
  ],
  attributesToSnippet: [] satisfies string[]
}

export type MemeRecord = ReturnType<typeof buildMemeRecord>

const matchIsHighlightResultOption = (
  highlight: HighlightResult
): highlight is HighlightResultOption => {
  return !Array.isArray(highlight) && typeof highlight.matchLevel === 'string'
}

const getHighlightedTitle = (hit: Hit<MemeRecord>) => {
  const titleHighlight = hit._highlightResult?.title
  const isTitleMatched =
    titleHighlight !== undefined &&
    matchIsHighlightResultOption(titleHighlight) &&
    titleHighlight.matchLevel !== 'none'

  return isTitleMatched ? titleHighlight.value : undefined
}

const MEME_HIT_SCHEMA = z.object({
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

const parseMemeHit = (hit: unknown) => {
  const parsedHit = MEME_HIT_SCHEMA.safeParse(hit)

  if (!parsedHit.success) {
    algoliaLogger.warn(
      { issues: parsedHit.error.issues },
      'Algolia hit does not match the meme schema'
    )

    return null
  }

  return parsedHit.data
}

const parseMemeHits = (hits: unknown[]) => {
  return hits.flatMap((hit) => {
    const meme = parseMemeHit(hit)

    return meme ? [meme] : []
  })
}

const MEMES_PAGE_SCHEMA = z.object({
  memes: z.array(
    MEME_HIT_SCHEMA.extend({ highlightedTitle: z.string().optional() })
  ),
  queryID: z.string().optional(),
  page: z.number(),
  totalPages: z.number(),
  totalHits: z.number()
})

type MemeHitFields = {
  contentLocale?: MemeContentLocale
  createdAt: string | Date
  updatedAt: string | Date
  publishedAt: string | Date | null
}

const normalizeMemeHit = <THit extends MemeHitFields>(hit: THit) => {
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

export const buildMemeRecord = (meme: MemeAlgoliaData, locale: Locale) => {
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
        body: buildMemeRecord(meme, locale)
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
          return buildMemeRecord(meme, locale)
        })

      await getAlgoliaAdminClient().replaceAllObjects({
        indexName: resolveAlgoliaIndexName(locale),
        objects: records
      })

      return { locale, count: records.length }
    })
  )
}

type SearchMemesParams = {
  indexName: string
  page: number
  hitsPerPage: number
  query?: string
  filters?: string
  userToken?: string
  isHighlighted?: boolean
  removeWordsIfNoResults?: 'allOptional'
}

type CountMemesParams = {
  indexName: string
  filters: string
}

type RecommendMemesParams = {
  cacheKey: string
  ttl: number
  indexName: string
  filters: string
  maxRecommendations: number
} & (
  | { model: 'trending-items' }
  | { model: 'related-products'; objectID: string; fallbackQuery: string }
)

type SearchAdminMemesParams = {
  indexName: string
  query: string | undefined
  page: number
  hitsPerPage: number
  filters: string | undefined
}

type WithCacheKey<TParams> = TParams & { cacheKey?: string }

const fetchMemesPage = async ({
  indexName,
  query,
  page,
  hitsPerPage,
  filters,
  userToken,
  isHighlighted = false,
  removeWordsIfNoResults
}: SearchMemesParams) => {
  const response = await getAlgoliaSearchClient().searchSingleIndex<MemeRecord>(
    {
      indexName,
      searchParams: {
        query,
        page,
        hitsPerPage,
        filters,
        clickAnalytics: true,
        userToken,
        removeWordsIfNoResults,
        ...PUBLIC_SEARCH_PARAMS
      }
    }
  )

  return {
    memes: response.hits.flatMap((hit) => {
      const meme = parseMemeHit(hit)

      if (!meme) {
        return []
      }

      return [
        {
          ...meme,
          highlightedTitle: isHighlighted ? getHighlightedTitle(hit) : undefined
        }
      ]
    }),
    queryID: response.queryID,
    page: response.page ?? 0,
    totalPages: response.nbPages ?? 0,
    totalHits: response.nbHits ?? 0
  }
}

const fetchMemesCount = async ({ indexName, filters }: CountMemesParams) => {
  const response = await getAlgoliaSearchClient().searchSingleIndex({
    indexName,
    searchParams: {
      filters,
      hitsPerPage: 0,
      attributesToRetrieve: [],
      attributesToHighlight: [],
      attributesToSnippet: []
    }
  })

  return response.nbHits ?? 0
}

const readCachedMemesPage = createAlgoliaCache({
  schema: MEMES_PAGE_SCHEMA,
  fetchFresh: fetchMemesPage
})

const readCachedMemesCount = createAlgoliaCache({
  schema: z.number(),
  fetchFresh: fetchMemesCount
})

export const searchMemes = async ({
  cacheKey,
  ...params
}: WithCacheKey<SearchMemesParams>) => {
  const page =
    cacheKey === undefined
      ? await fetchMemesPage(params)
      : await readCachedMemesPage({ key: cacheKey, params })

  return { ...page, memes: page.memes.map(normalizeMemeHit) }
}

export const countMemes = ({
  cacheKey,
  ...params
}: WithCacheKey<CountMemesParams>) => {
  return cacheKey === undefined
    ? fetchMemesCount(params)
    : readCachedMemesCount({ key: cacheKey, params })
}

const buildRecommendationRequest = (
  params: RecommendMemesParams
): RecommendationsRequest => {
  const queryParameters = {
    filters: params.filters,
    attributesToRetrieve: [...PUBLIC_RETRIEVE]
  }

  if (params.model === 'trending-items') {
    return {
      indexName: params.indexName,
      model: 'trending-items',
      threshold: 0,
      maxRecommendations: params.maxRecommendations,
      queryParameters
    }
  }

  return {
    indexName: params.indexName,
    model: 'related-products',
    objectID: params.objectID,
    threshold: 0,
    maxRecommendations: params.maxRecommendations,
    queryParameters,
    fallbackParameters: { query: params.fallbackQuery, filters: params.filters }
  }
}

export const recommendMemes = async (params: RecommendMemesParams) => {
  const cachedHits = await readRecommendCache(params.cacheKey)

  if (Array.isArray(cachedHits)) {
    return parseMemeHits(cachedHits).map(normalizeMemeHit)
  }

  const response = await getAlgoliaRecommendClient().getRecommendations({
    requests: [buildRecommendationRequest(params)]
  })
  const memes = parseMemeHits(response.results[0]?.hits ?? []).map(
    normalizeMemeHit
  )

  if (memes.length > 0) {
    void writeRecommendCache({
      key: params.cacheKey,
      data: memes,
      ttl: params.ttl
    })
  }

  return memes
}

export const searchAdminMemes = async ({
  indexName,
  query,
  page,
  hitsPerPage,
  filters
}: SearchAdminMemesParams) => {
  const response = await getAlgoliaSearchClient().searchSingleIndex<MemeRecord>(
    {
      indexName,
      searchParams: {
        query,
        page,
        hitsPerPage,
        filters,
        ...ADMIN_SEARCH_PARAMS
      }
    }
  )

  return {
    hits: response.hits.map(normalizeMemeHit),
    page: response.page,
    totalPages: response.nbPages
  }
}
