import { z } from 'zod'
import {
  COOKIE_ALGOLIA_USER_TOKEN_KEY,
  COOKIE_ANON_ID_KEY,
  COOKIE_CONSENT_KEY
} from '@/constants/cookie'
import {
  MEME_FULL_INCLUDE,
  MEMES_FILTERS_SCHEMA,
  MEMES_PER_PAGE,
  NEWS_CATEGORY_SLUG,
  POPULAR_CATEGORY_SLUG,
  RELATED_MEMES_COUNT,
  TRENDING_MEMES_COUNT,
  VIRTUAL_CATEGORY_SLUGS
} from '@/constants/meme'
import { RATE_LIMIT_DOWNLOAD, RATE_LIMIT_TRACK } from '@/constants/rate-limit'
import {
  ONE_HOUR_MS,
  ONE_YEAR_IN_SECONDS,
  THIRTY_DAYS_MS
} from '@/constants/time'
import { prismaClient } from '@/db'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { truncateToUtcDay } from '@/helpers/date'
import {
  resolveCategoryTranslation,
  resolveMemeTranslation,
  VISIBLE_CONTENT_LOCALES
} from '@/helpers/i18n-content'
import type { AlgoliaMemeRecord } from '@/lib/algolia'
import {
  ALGOLIA_RECOMMEND_CACHE_TTL,
  ALGOLIA_SEARCH_PARAMS_BASE,
  ALGOLIA_SEARCH_RETRIEVE,
  algoliaIndexName,
  algoliaIndexPopular,
  algoliaIndexRecent,
  algoliaRecommendClient,
  algoliaSearchClient,
  getHighlightedTitle,
  normalizeAlgoliaHit,
  safeAlgoliaOp,
  withAlgoliaCache
} from '@/lib/algolia'
import { auth } from '@/lib/auth'
import { buildSignedOriginalUrl } from '@/lib/bunny'
import { algoliaLogger, logger } from '@/lib/logger'
import { getLocale } from '@/paraglide/runtime'
import { createRateLimitMiddleware, extractClientIp } from '@/server/rate-limit'
import { authUserRequiredMiddleware } from '@/server/user-auth'
import { ensureAlgoliaUserToken } from '@/utils/tracking-cookies'
import { insightsClient as createInsightsClient } from '@algolia/client-insights'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getCookie, getRequest, setCookie } from '@tanstack/react-start/server'

const serverInsightsClient = createInsightsClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_ADMIN_KEY
)

function buildMemeFilters(category: string | undefined, thirtyDaysAgo: number) {
  const filters = [`status:${MemeStatus.PUBLISHED}`]

  if (category === NEWS_CATEGORY_SLUG) {
    filters.push(`publishedAtTime >= ${thirtyDaysAgo}`)
  } else if (category && !VIRTUAL_CATEGORY_SLUGS.has(category)) {
    filters.push(`categorySlugs:"${category}"`)
  }

  return filters.join(' AND ')
}

function resolveIndexName(category: string | undefined, hasQuery: boolean) {
  if (hasQuery) {
    return algoliaIndexName
  }

  if (category === POPULAR_CATEGORY_SLUG) {
    return algoliaIndexPopular
  }

  if (category === NEWS_CATEGORY_SLUG) {
    return algoliaIndexRecent
  }

  return algoliaIndexName
}

export const getMemeById = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId,
        status: MemeStatus.PUBLISHED
      },
      include: MEME_FULL_INCLUDE
    })

    if (!meme) {
      throw notFound()
    }

    const locale = getLocale()
    const resolved = resolveMemeTranslation({
      translations: meme.translations,
      contentLocale: meme.contentLocale,
      requestedLocale: locale,
      fallback: meme
    })

    return {
      ...meme,
      title: resolved.title,
      description: resolved.description,
      keywords: resolved.keywords,
      categories: meme.categories.map((memeCategory) => {
        const resolvedCategory = resolveCategoryTranslation({
          translations: memeCategory.category.translations,
          requestedLocale: locale,
          fallback: memeCategory.category
        })

        return {
          ...memeCategory,
          category: {
            ...memeCategory.category,
            title: resolvedCategory.title,
            keywords: resolvedCategory.keywords
          }
        }
      })
    }
  })

export const getVideoStatusById = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.number().parse(data)
  })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ data: videoId }) => {
    const video = await prismaClient.video.findUnique({
      where: {
        id: videoId
      },
      select: {
        bunnyStatus: true
      }
    })

    if (!video) {
      throw notFound()
    }

    return {
      status: video.bunnyStatus
    }
  })

export const getMemes = createServerFn({ method: 'GET' })
  .inputValidator(MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const hasQuery = Boolean(data.query)
    const indexName = resolveIndexName(data.category, hasQuery)
    const cacheKey = `${indexName}:${data.query ?? ''}:${data.page ?? 1}:${data.category ?? ''}`
    const hasConsentedToCookies = getCookie(COOKIE_CONSENT_KEY) === 'accepted'
    const userToken = hasConsentedToCookies
      ? getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)
      : undefined

    return withAlgoliaCache(cacheKey, async () => {
      const thirtyDaysAgo = Date.now() - THIRTY_DAYS_MS
      const filters = buildMemeFilters(data.category, thirtyDaysAgo)

      const response =
        await algoliaSearchClient.searchSingleIndex<AlgoliaMemeRecord>({
          indexName,
          searchParams: {
            query: data.query,
            page: data.page ? data.page - 1 : 0,
            hitsPerPage: MEMES_PER_PAGE,
            filters,
            clickAnalytics: true,
            userToken,
            ...ALGOLIA_SEARCH_PARAMS_BASE
          }
        })

      return {
        memes: response.hits.map((hit) => {
          return {
            ...normalizeAlgoliaHit(hit),
            highlightedTitle: hasQuery ? getHighlightedTitle(hit) : undefined
          }
        }),
        query: data.query,
        queryID: response.queryID,
        page: response.page,
        totalPages: response.nbPages
      }
    })
  })

export const getRecentCountMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    return withAlgoliaCache('recent-count', async () => {
      const thirtyDaysAgo = Date.now() - THIRTY_DAYS_MS

      const countResult = await algoliaSearchClient.searchSingleIndex({
        indexName: algoliaIndexName,
        searchParams: {
          filters: [
            `status:${MemeStatus.PUBLISHED}`,
            `publishedAtTime >= ${thirtyDaysAgo}`
          ].join(' AND '),
          hitsPerPage: 0,
          attributesToRetrieve: [],
          attributesToHighlight: [],
          attributesToSnippet: []
        }
      })

      return countResult.nbHits ?? 0
    })
  }
)

const getBestMemesInternal = createServerOnlyFn(async () => {
  const locale = getLocale()

  return prismaClient.meme.findMany({
    take: TRENDING_MEMES_COUNT,
    include: {
      video: true
    },
    orderBy: {
      viewCount: 'desc'
    },
    where: {
      status: MemeStatus.PUBLISHED,
      contentLocale: { in: VISIBLE_CONTENT_LOCALES[locale] }
    }
  })
})

export const getRelatedMemes = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ memeId: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    return withAlgoliaCache(
      `recommend:related:${data.memeId}`,
      async () => {
        try {
          const response = await algoliaRecommendClient.getRecommendations({
            requests: [
              {
                indexName: algoliaIndexName,
                model: 'related-products',
                objectID: data.memeId,
                threshold: 0,
                maxRecommendations: RELATED_MEMES_COUNT,
                queryParameters: {
                  filters: `status:${MemeStatus.PUBLISHED}`,
                  attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE]
                },
                fallbackParameters: {
                  query: data.title,
                  filters: `status:${MemeStatus.PUBLISHED}`
                }
              }
            ]
          })

          const hits = (response.results[0]?.hits ?? []) as AlgoliaMemeRecord[]

          return hits.map(normalizeAlgoliaHit)
        } catch {
          algoliaLogger.warn('Related-products recommendation unavailable')

          return []
        }
      },
      ALGOLIA_RECOMMEND_CACHE_TTL
    )
  })

export const getTrendingMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const trending = await withAlgoliaCache(
      'recommend:trending',
      async () => {
        try {
          const response = await algoliaRecommendClient.getRecommendations({
            requests: [
              {
                indexName: algoliaIndexName,
                model: 'trending-items',
                threshold: 0,
                maxRecommendations: TRENDING_MEMES_COUNT,
                queryParameters: {
                  filters: `status:${MemeStatus.PUBLISHED}`,
                  attributesToRetrieve: [...ALGOLIA_SEARCH_RETRIEVE]
                }
              }
            ]
          })

          const hits = (response.results[0]?.hits ?? []) as AlgoliaMemeRecord[]

          return hits.map(normalizeAlgoliaHit)
        } catch {
          algoliaLogger.warn('Trending-items recommendation unavailable')

          return []
        }
      },
      ALGOLIA_RECOMMEND_CACHE_TTL
    )

    if (trending.length === 0) {
      return getBestMemesInternal()
    }

    return trending
  }
)

export const getRandomMeme = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().optional().parse(data)
  })
  .handler(async ({ data: exceptId }) => {
    const locale = getLocale()

    const whereCondition = {
      status: MemeStatus.PUBLISHED,
      contentLocale: { in: VISIBLE_CONTENT_LOCALES[locale] },
      ...(exceptId ? { id: { not: exceptId } } : {})
    }

    const count = await prismaClient.meme.count({ where: whereCondition })

    if (count === 0) {
      return null
    }

    const randomOffset = Math.floor(Math.random() * count)

    const [meme] = await prismaClient.meme.findMany({
      where: whereCondition,
      select: { id: true },
      skip: randomOffset,
      take: 1
    })

    return meme ?? null
  })

export const shareMeme = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_DOWNLOAD)])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId,
        status: MemeStatus.PUBLISHED
      },
      select: {
        video: {
          select: {
            bunnyId: true
          }
        }
      }
    })

    if (!meme) {
      throw notFound()
    }

    const originalUrl = buildSignedOriginalUrl(meme.video.bunnyId)

    const request = getRequest()
    const ip = extractClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    logger.info({ memeId, ip, userAgent }, 'Meme shared/downloaded')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      return controller.abort()
    }, 15_000)

    try {
      const response = await fetch(originalUrl, {
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Bunny CDN responded with status ${response.status}`)
      }

      return new Response(response.body, {
        headers: {
          'Content-Type': response.headers.get('Content-Type') ?? 'video/mp4',
          'Cache-Control': 'no-cache'
        }
      })
    } finally {
      clearTimeout(timeoutId)
    }
  })

const TRACK_MEME_ACTION_SCHEMA = z.object({
  memeId: z.string(),
  action: z.enum(['share', 'download'])
})

export const trackMemeAction = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return TRACK_MEME_ACTION_SCHEMA.parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_TRACK)])
  .handler(async ({ data }) => {
    const countField = data.action === 'share' ? 'shareCount' : 'downloadCount'
    const day = truncateToUtcDay(new Date())

    await prismaClient.$transaction(async (tx) => {
      const updated = await tx.meme.updateMany({
        where: { id: data.memeId, status: MemeStatus.PUBLISHED },
        data: { [countField]: { increment: 1 } }
      })

      if (updated.count === 0) {
        return
      }

      await tx.memeActionDaily.upsert({
        where: {
          // eslint-disable-next-line camelcase -- Prisma compound unique key
          memeId_day_action: { memeId: data.memeId, day, action: data.action }
        },
        create: { memeId: data.memeId, day, action: data.action, count: 1 },
        update: { count: { increment: 1 } }
      })
    })
  })

export const registerMemeView = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string(),
        watchMs: z.number().int().min(0).max(ONE_HOUR_MS)
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const { memeId, watchMs } = data

    const hasConsentedToCookies = getCookie(COOKIE_CONSENT_KEY) === 'accepted'
    const existingViewerKey = getCookie(COOKIE_ANON_ID_KEY)
    const viewerKey =
      existingViewerKey ??
      getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY) ??
      crypto.randomUUID()

    if (hasConsentedToCookies) {
      ensureAlgoliaUserToken(viewerKey)

      if (!existingViewerKey) {
        setCookie(COOKIE_ANON_ID_KEY, viewerKey, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: ONE_YEAR_IN_SECONDS
        })
      }
    }

    const day = truncateToUtcDay(new Date())

    const viewTransaction = prismaClient.$transaction(async (tx) => {
      const result = await tx.memeViewDaily.createMany({
        data: [{ memeId, viewerKey, day, watchMs }],
        skipDuplicates: true
      })

      if (result.count === 1) {
        await tx.meme.update({
          where: { id: memeId },
          data: { viewCount: { increment: 1 } }
        })
      }
    })

    const trackAlgoliaView = async () => {
      if (!hasConsentedToCookies) {
        return
      }

      const { headers } = getRequest()
      const session = await auth.api.getSession({ headers })

      await safeAlgoliaOp(
        serverInsightsClient.pushEvents({
          events: [
            {
              eventType: 'view',
              eventName: 'Meme Viewed',
              index: algoliaIndexName,
              objectIDs: [memeId],
              userToken: viewerKey,
              authenticatedUserToken: session?.user.id
            }
          ]
        })
      )
    }

    void trackAlgoliaView()
    await viewTransaction
  })
