import { z } from 'zod'
import { COOKIE_ANON_ID_KEY, COOKIE_CONSENT_KEY } from '@/constants/cookie'
import {
  MEME_FULL_INCLUDE,
  MEMES_FILTERS_SCHEMA,
  NEWS_CATEGORY_SLUG
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
  ALGOLIA_SEARCH_PARAMS_BASE,
  algoliaIndexName,
  algoliaSearchClient,
  normalizeAlgoliaHit,
  withAlgoliaCache
} from '@/lib/algolia'
import { buildVideoOriginalUrl } from '@/lib/bunny'
import { authUserRequiredMiddleware } from '@/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
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

      const response =
        await algoliaSearchClient.searchSingleIndex<AlgoliaMemeRecord>({
          indexName: algoliaIndexName,
          searchParams: {
            query: data.query,
            page: data.page ? data.page - 1 : 0,
            hitsPerPage: 30,
            filters,
            ...ALGOLIA_SEARCH_PARAMS_BASE
          }
        })

      return {
        memes: response.hits.map(normalizeAlgoliaHit),
        query: data.query,
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

export const getBestMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const memes = await prismaClient.meme.findMany({
      take: 12,
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

    return memes
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
    const viewerKey = existingViewerKey ?? crypto.randomUUID()

    if (!existingViewerKey && hasConsentedToCookies) {
      setCookie(COOKIE_ANON_ID_KEY, viewerKey, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: ONE_YEAR_IN_SECONDS
      })
    }

    const now = new Date()
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )

    await prismaClient.$transaction(async (tx) => {
      const result = await tx.memeViewDaily.createMany({
        data: [
          {
            memeId,
            viewerKey,
            day,
            watchMs
          }
        ],
        skipDuplicates: true
      })

      if (result.count === 1) {
        await tx.meme.update({
          where: { id: memeId },
          data: { viewCount: { increment: 1 } }
        })
      }
    })
  })
