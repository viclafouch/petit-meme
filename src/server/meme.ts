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
  RELATED_MEMES_COUNT,
  TRENDING_MEMES_COUNT
} from '@/constants/meme'
import {
  ONE_HOUR_MS,
  ONE_YEAR_IN_SECONDS,
  THIRTY_DAYS_MS
} from '@/constants/time'
import { prismaClient } from '@/db'
import { MemeStatus } from '@/db/generated/prisma/enums'
import type { AlgoliaMemeRecord } from '@/lib/algolia'
import {
  ALGOLIA_RECOMMEND_CACHE_TTL,
  ALGOLIA_SEARCH_PARAMS_BASE,
  ALGOLIA_SEARCH_RETRIEVE,
  algoliaIndexName,
  algoliaRecommendClient,
  algoliaSearchClient,
  getHighlightedTitle,
  normalizeAlgoliaHit,
  withAlgoliaCache
} from '@/lib/algolia'
import { buildVideoOriginalUrl } from '@/lib/bunny'
import { authUserRequiredMiddleware } from '@/server/user-auth'
import { ensureAlgoliaUserToken } from '@/utils/tracking-cookies'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

function buildMemeFilters(category: string | undefined, thirtyDaysAgo: number) {
  const filters = [`status:${MemeStatus.PUBLISHED}`]

  if (category === NEWS_CATEGORY_SLUG) {
    filters.push(`publishedAtTime >= ${thirtyDaysAgo}`)
  } else if (category) {
    filters.push(`categorySlugs:"${category}"`)
  }

  return filters.join(' AND ')
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

    return meme
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
    const cacheKey = `memes:${data.query ?? ''}:${data.page ?? 1}:${data.category ?? ''}`

    return withAlgoliaCache(cacheKey, async () => {
      const thirtyDaysAgo = Date.now() - THIRTY_DAYS_MS
      const filters = buildMemeFilters(data.category, thirtyDaysAgo)

      const hasQuery = Boolean(data.query)

      const response =
        await algoliaSearchClient.searchSingleIndex<AlgoliaMemeRecord>({
          indexName: algoliaIndexName,
          searchParams: {
            query: data.query,
            page: data.page ? data.page - 1 : 0,
            hitsPerPage: MEMES_PER_PAGE,
            filters,
            ...(hasQuery ? { clickAnalytics: true } : {}),
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
        queryID: hasQuery ? response.queryID : undefined,
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
  return prismaClient.meme.findMany({
    take: TRENDING_MEMES_COUNT,
    include: {
      video: true
    },
    orderBy: {
      viewCount: 'desc'
    },
    where: {
      status: MemeStatus.PUBLISHED
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
          // eslint-disable-next-line no-console
          console.warn('[Recommend] related-products unavailable')

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
          // eslint-disable-next-line no-console
          console.warn('[Recommend] trending-items unavailable')

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
    const where = {
      status: MemeStatus.PUBLISHED,
      ...(exceptId ? { id: { not: exceptId } } : {})
    } as const

    const count = await prismaClient.meme.count({ where })

    if (count === 0) {
      return null
    }

    const skip = Math.floor(Math.random() * count)

    const meme = await prismaClient.meme.findFirst({
      where,
      select: { id: true },
      skip
    })

    return meme
  })

export const shareMeme = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
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

    const originalUrl = buildVideoOriginalUrl(meme.video.bunnyId)

    const response = await fetch(originalUrl)

    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'video/mp4',
        'Cache-Control': 'no-cache'
      }
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

    const now = new Date()
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )

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

    const promises: Promise<unknown>[] = [viewTransaction]

    if (hasConsentedToCookies) {
      const { sendAlgoliaViewEvent } =
        await import('@/lib/algolia-insights.server')

      promises.push(sendAlgoliaViewEvent({ memeId, userToken: viewerKey }))
    }

    await Promise.all(promises)
  })
