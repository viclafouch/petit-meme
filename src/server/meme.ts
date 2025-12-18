import { z } from 'zod'
import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import { MEMES_FILTERS_SCHEMA, MemeStatusFixed } from '@/constants/meme'
import { prismaClient } from '@/db'
import { algoliaClient, algoliaIndexName } from '@/lib/algolia'
import { getVideoPlayData } from '@/lib/bunny'
import { authUserRequiredMiddleware } from '@/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

export const getMemeById = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId
      },
      include: {
        video: true,
        categories: {
          include: { category: true }
        }
      }
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
    const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000

    const response = await algoliaClient.searchSingleIndex<
      MemeWithVideo & MemeWithCategories
    >({
      indexName: algoliaIndexName,
      searchParams: {
        query: data.query,
        page: data.page ? data.page - 1 : 0,
        hitsPerPage: 30,
        filters: (() => {
          const filters: string[] = [`status:${MemeStatusFixed.PUBLISHED}`]

          if (data.category === 'news') {
            filters.push(`createdAtTime >= ${THIRTY_DAYS_AGO}`)
          } else if (data.category) {
            filters.push(`categorySlugs:${data.category}`)
          }

          return filters.length ? filters.join(' AND ') : undefined
        })()
      }
    })

    return {
      memes: response.hits as (MemeWithVideo & MemeWithCategories)[],
      query: data.query,
      page: response.page,
      totalPages: response.nbPages
    }
  })

export const getRecentCountMemes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000 // 1 month ago

    const countResult = await algoliaClient.searchSingleIndex({
      indexName: algoliaIndexName,
      searchParams: {
        filters: [
          `status:${MemeStatusFixed.PUBLISHED}`,
          `createdAtTime >= ${THIRTY_DAYS_AGO}`
        ].join(' AND '),
        hitsPerPage: 0
      }
    })

    return countResult.nbHits ?? 0
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
        status: MemeStatusFixed.PUBLISHED
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
    const memes = await prismaClient.meme.findMany({
      include: {
        video: true
      },
      where: {
        status: 'PUBLISHED'
      }
    })

    const withoutCurrentMeme = memes.filter((meme) => {
      return meme.id !== exceptId
    })

    const randomIndex = Math.floor(Math.random() * withoutCurrentMeme.length)

    return withoutCurrentMeme[randomIndex]
  })

export const shareMeme = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId
      },
      include: {
        video: true
      }
    })

    if (!meme) {
      throw notFound()
    }

    const { originalUrl } = await getVideoPlayData({ data: meme.video.bunnyId })

    const response = await fetch(originalUrl)
    const blob = await response.blob()

    return new Response(blob, {
      headers: {
        'Content-Type': blob.type,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  })

export const registerMemeView = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string(),
        watchMs: z
          .number()
          .int()
          .min(0)
          .max(60 * 60 * 1000)
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const { memeId, watchMs } = data

    let viewerKey = getCookie('anonId')

    if (!viewerKey) {
      viewerKey = crypto.randomUUID()

      setCookie('anonId', viewerKey, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365
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
