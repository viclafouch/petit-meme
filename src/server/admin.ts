import { filesize } from 'filesize'
import { z } from 'zod'
import { BUNNY_STATUS } from '@/constants/bunny'
import {
  DEFAULT_MEME_TITLE,
  MAX_SIZE_MEME_IN_BYTES,
  MEME_FULL_INCLUDE,
  MEMES_FILTERS_SCHEMA,
  MEMES_PER_PAGE,
  TWEET_LINK_SCHEMA
} from '@/constants/meme'
import { prismaClient } from '@/db'
import { MemeStatus } from '@/db/generated/prisma/enums'
import type { AlgoliaMemeRecord } from '@/lib/algolia'
import {
  ALGOLIA_ADMIN_SEARCH_PARAMS,
  algoliaAdminClient,
  algoliaIndexName,
  algoliaSearchClient,
  invalidateAlgoliaCache,
  memeToAlgoliaRecord,
  normalizeAlgoliaHit,
  safeAlgoliaOp,
  withAlgoliaCache
} from '@/lib/algolia'
import { auth } from '@/lib/auth'
import { createVideo, deleteVideo, uploadVideo } from '@/lib/bunny'
import {
  extractTweetIdFromUrl,
  getTweetById,
  getTweetMedia
} from '@/lib/react-tweet'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const getAdminMemeById = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId
      },
      include: MEME_FULL_INCLUDE
    })

    if (!meme) {
      throw notFound()
    }

    return meme
  })

export const getListUsers = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    const { headers } = getRequest()

    const listUsers = await auth.api.listUsers({
      query: {
        limit: 500,
        offset: 0,
        sortBy: 'createdAt'
      },
      headers
    })

    return listUsers
  })

export const MEME_FORM_SCHEMA = z.object({
  title: z.string().min(3),
  keywords: z.array(z.string()),
  description: z.string().max(200),
  categoryIds: z.array(z.string()),
  status: z.enum(MemeStatus),
  tweetUrl: TWEET_LINK_SCHEMA.nullable().or(
    z
      .string()
      .length(0)
      .transform(() => {
        return null
      })
  )
})

function resolvePublishedAt(
  newStatus: string,
  meme: { status: string; publishedAt: Date | null }
) {
  if (newStatus === 'PUBLISHED' && meme.status !== 'PUBLISHED') {
    return new Date()
  }

  if (newStatus !== 'PUBLISHED') {
    return null
  }

  return meme.publishedAt
}

function resolveInitialViewCount(
  newStatus: string,
  meme: { status: string; viewCount: number }
) {
  const isFirstPublish =
    newStatus === 'PUBLISHED' && meme.status !== 'PUBLISHED'

  if (isFirstPublish && meme.viewCount === 0) {
    return Math.floor(Math.random() * (120 - 30 + 1)) + 30
  }

  return meme.viewCount
}

export const editMeme = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return MEME_FORM_SCHEMA.extend({ id: z.string() }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: values.id
      },
      include: {
        video: true,
        categories: { select: { categoryId: true } }
      }
    })

    if (!meme) {
      throw new Error('Meme not found')
    }

    const publishedAt = resolvePublishedAt(values.status, meme)
    const viewCount = resolveInitialViewCount(values.status, meme)

    const currentCategoryIds = meme.categories.map(({ categoryId }) => {
      return categoryId
    })
    const toAdd = values.categoryIds.filter((categoryId) => {
      return !currentCategoryIds.includes(categoryId)
    })
    const toRemove = currentCategoryIds.filter((categoryId) => {
      return !values.categoryIds.includes(categoryId)
    })

    const memeUpdated = await prismaClient.meme.update({
      where: {
        id: values.id
      },
      data: {
        title: values.title,
        status: values.status,
        description: values.description,
        publishedAt,
        viewCount,
        categories: {
          deleteMany:
            toRemove.length > 0 ? { categoryId: { in: toRemove } } : undefined,
          create: toAdd.map((categoryId) => {
            return {
              category: {
                connect: { id: categoryId }
              }
            }
          })
        },
        keywords: values.keywords.map((keyword) => {
          return keyword.toLowerCase().trim()
        }),
        tweetUrl: values.tweetUrl || null
      },
      include: MEME_FULL_INCLUDE
    })

    await safeAlgoliaOp(
      algoliaAdminClient.partialUpdateObject({
        indexName: algoliaIndexName,
        objectID: meme.id,
        attributesToUpdate: memeToAlgoliaRecord(memeUpdated)
      })
    )

    invalidateAlgoliaCache()

    return { id: memeUpdated.id }
  })

export const deleteMemeById = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.delete({
      where: {
        id: memeId
      },
      include: {
        video: true
      }
    })

    await Promise.all([
      prismaClient.video.delete({ where: { id: meme.videoId } }),
      safeAlgoliaOp(
        algoliaAdminClient.deleteObject({
          indexName: algoliaIndexName,
          objectID: meme.id
        })
      ),
      deleteVideo(meme.video.bunnyId).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error)
      })
    ])

    invalidateAlgoliaCache()

    return { id: meme.id }
  })

type CreateMemeWithVideoParams = {
  buffer: Buffer
  tweetUrl?: string
}

async function createMemeWithVideo({
  buffer,
  tweetUrl
}: CreateMemeWithVideoParams) {
  const title = DEFAULT_MEME_TITLE
  const { videoId } = await createVideo(title)

  const meme = await prismaClient.meme.create({
    data: {
      title,
      tweetUrl,
      status: 'PENDING',
      video: {
        create: {
          duration: 0,
          bunnyStatus:
            process.env.NODE_ENV !== 'production'
              ? BUNNY_STATUS.RESOLUTION_FINISHED
              : undefined,
          bunnyId: videoId
        }
      }
    },
    include: MEME_FULL_INCLUDE
  })

  await Promise.all([
    safeAlgoliaOp(
      algoliaAdminClient.saveObject({
        indexName: algoliaIndexName,
        body: memeToAlgoliaRecord(meme)
      })
    ),
    uploadVideo(videoId, buffer)
  ])

  invalidateAlgoliaCache()

  return { id: meme.id }
}

export const createMemeFromTwitterUrl = createServerFn({ method: 'POST' })
  .inputValidator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url }) => {
    const tweetId = z.string().parse(extractTweetIdFromUrl(url))

    const tweet = await getTweetById(tweetId)
    const media = await getTweetMedia(tweet.video.url, tweet.poster.url)

    if (media.video.blob.size > MAX_SIZE_MEME_IN_BYTES) {
      throw new Error(
        `Video size is too big: ${filesize(media.video.blob.size)}`
      )
    }

    const buffer = Buffer.from(await media.video.blob.arrayBuffer())

    return createMemeWithVideo({ buffer, tweetUrl: tweet.url })
  })

export const CREATE_MEME_FROM_FILE_SCHEMA = z.object({
  video: z.file().min(1).max(MAX_SIZE_MEME_IN_BYTES).mime('video/mp4')
})

export const createMemeFromFile = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    const formData = z.instanceof(FormData).parse(data)

    return CREATE_MEME_FROM_FILE_SCHEMA.parse({
      video: formData.get('video')
    })
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values }) => {
    const buffer = Buffer.from(await values.video.arrayBuffer())

    return createMemeWithVideo({ buffer })
  })

export const getAdminMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const cacheKey = `admin-memes:${data.query ?? ''}:${data.page ?? 1}:${data.status ?? ''}`

    return withAlgoliaCache(cacheKey, async () => {
      const filters = data.status ? `status:${data.status}` : undefined

      const response =
        await algoliaSearchClient.searchSingleIndex<AlgoliaMemeRecord>({
          indexName: algoliaIndexName,
          searchParams: {
            query: data.query,
            page: data.page ? data.page - 1 : 0,
            hitsPerPage: MEMES_PER_PAGE,
            filters,
            ...ALGOLIA_ADMIN_SEARCH_PARAMS
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

export const removeUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(z.string())
  .handler(async ({ data: userId }) => {
    const user = await prismaClient.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const { headers } = getRequest()

    await auth.api.removeUser({
      body: {
        userId: user.id
      },
      headers
    })

    return { success: true }
  })
