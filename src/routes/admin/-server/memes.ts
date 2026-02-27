import { filesize } from 'filesize'
import { z } from 'zod'
import { BUNNY_STATUS } from '@/constants/bunny'
import { IS_PRODUCTION } from '@/constants/env'
import {
  DEFAULT_MEME_TITLE,
  MAX_SIZE_MEME_IN_BYTES,
  MEME_FULL_INCLUDE,
  MEMES_PER_PAGE,
  MEMES_SEARCH_SCHEMA,
  TWEET_LINK_SCHEMA
} from '@/constants/meme'
import { prismaClient } from '@/db'
import { MemeStatus } from '@/db/generated/prisma/enums'
import type { AlgoliaMemeRecord } from '@/lib/algolia'
import {
  ALGOLIA_ADMIN_SEARCH_PARAMS,
  algoliaAdminClient,
  algoliaIndexCreated,
  algoliaIndexName,
  algoliaSearchClient,
  invalidateAlgoliaCache,
  memeToAlgoliaRecord,
  normalizeAlgoliaHit,
  safeAlgoliaOp,
  withAlgoliaCache
} from '@/lib/algolia'
import { createVideo, deleteVideo, uploadVideo } from '@/lib/bunny'
import { adminLogger, bunnyLogger } from '@/lib/logger'
import {
  extractTweetIdFromUrl,
  getTweetById,
  getTweetMedia
} from '@/lib/react-tweet'
import { captureWithFeature } from '@/lib/sentry'
import { logAuditAction } from '@/server/audit'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

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

export const MEME_FORM_SCHEMA = z.object({
  title: z.string().min(3).max(100),
  keywords: z.array(z.string().max(50)).max(20),
  description: z.string().max(200),
  categoryIds: z.array(z.string()).max(10),
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

const INITIAL_VIEW_COUNT_MIN = 30
const INITIAL_VIEW_COUNT_MAX = 120

function resolveInitialViewCount(
  newStatus: string,
  meme: { status: string; viewCount: number }
) {
  const isFirstPublish =
    newStatus === 'PUBLISHED' && meme.status !== 'PUBLISHED'

  if (isFirstPublish && meme.viewCount === 0) {
    const range = INITIAL_VIEW_COUNT_MAX - INITIAL_VIEW_COUNT_MIN + 1

    return Math.floor(Math.random() * range) + INITIAL_VIEW_COUNT_MIN
  }

  return meme.viewCount
}

function computeCategoryDiff(currentIds: string[], newIds: string[]) {
  const currentSet = new Set(currentIds)
  const newSet = new Set(newIds)

  return {
    toAdd: newIds.filter((id) => {
      return !currentSet.has(id)
    }),
    toRemove: currentIds.filter((id) => {
      return !newSet.has(id)
    })
  }
}

export const editMeme = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return MEME_FORM_SCHEMA.extend({ id: z.string() }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values, context }) => {
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
      adminLogger.warn({ memeId: values.id }, 'Meme not found for edit')
      throw new Error('Meme not found')
    }

    const publishedAt = resolvePublishedAt(values.status, meme)
    const viewCount = resolveInitialViewCount(values.status, meme)

    const currentCategoryIds = meme.categories.map(({ categoryId }) => {
      return categoryId
    })
    const { toAdd, toRemove } = computeCategoryDiff(
      currentCategoryIds,
      values.categoryIds
    )

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

    const hasStatusChanged = meme.status !== values.status

    void logAuditAction({
      action: 'edit',
      actingAdminId: context.user.id,
      targetId: memeUpdated.id,
      targetType: 'meme',
      metadata: { title: values.title }
    })

    if (hasStatusChanged) {
      void logAuditAction({
        action: 'status_change',
        actingAdminId: context.user.id,
        targetId: memeUpdated.id,
        targetType: 'meme',
        metadata: { title: values.title, from: meme.status, to: values.status }
      })
    }

    adminLogger.info(
      { memeId: memeUpdated.id, status: values.status },
      'Meme edited'
    )

    return { id: memeUpdated.id }
  })

export const deleteMemeById = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      include: { video: true }
    })

    if (!meme) {
      adminLogger.warn({ memeId }, 'Meme not found for deletion')
      throw new Error('Meme not found')
    }

    await prismaClient.$transaction([
      prismaClient.meme.delete({ where: { id: memeId } }),
      prismaClient.video.delete({ where: { id: meme.videoId } })
    ])

    await Promise.all([
      safeAlgoliaOp(
        algoliaAdminClient.deleteObject({
          indexName: algoliaIndexName,
          objectID: meme.id
        })
      ),
      deleteVideo(meme.video.bunnyId).catch((error: unknown) => {
        captureWithFeature(error, 'bunny-cleanup')
        bunnyLogger.error(
          { err: error, bunnyId: meme.video.bunnyId },
          'Failed to delete video from Bunny CDN'
        )
      })
    ])

    invalidateAlgoliaCache()

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: meme.id,
      targetType: 'meme',
      metadata: { title: meme.title }
    })

    adminLogger.info({ memeId: meme.id }, 'Meme deleted')

    return { id: meme.id }
  })

type CreateMemeWithVideoParams = {
  buffer: Buffer
  tweetUrl?: string
  adminId: string
}

async function rollbackMemeCreation(memeId: string) {
  await Promise.all([
    prismaClient.meme
      .delete({ where: { id: memeId } })
      .catch((cleanupError: unknown) => {
        adminLogger.error(
          { err: cleanupError, memeId },
          'Failed to rollback meme from DB'
        )
      }),
    safeAlgoliaOp(
      algoliaAdminClient.deleteObject({
        indexName: algoliaIndexName,
        objectID: memeId
      })
    )
  ])
}

async function createMemeWithVideo({
  buffer,
  tweetUrl,
  adminId
}: CreateMemeWithVideoParams) {
  const title = DEFAULT_MEME_TITLE
  const { videoId } = await createVideo(title)
  let meme

  try {
    meme = await prismaClient.meme.create({
      data: {
        title,
        tweetUrl,
        status: 'PENDING',
        video: {
          create: {
            duration: 0,
            bunnyStatus: !IS_PRODUCTION
              ? BUNNY_STATUS.RESOLUTION_FINISHED
              : undefined,
            bunnyId: videoId
          }
        }
      },
      include: MEME_FULL_INCLUDE
    })
  } catch (error) {
    await deleteVideo(videoId).catch((cleanupError: unknown) => {
      captureWithFeature(cleanupError, 'bunny-cleanup')
      bunnyLogger.error(
        { err: cleanupError, bunnyVideoId: videoId },
        'Failed to cleanup orphan Bunny video after DB error'
      )
    })
    throw error
  }

  try {
    await Promise.all([
      safeAlgoliaOp(
        algoliaAdminClient.saveObject({
          indexName: algoliaIndexName,
          body: memeToAlgoliaRecord(meme)
        })
      ),
      uploadVideo(videoId, buffer)
    ])
  } catch (error) {
    captureWithFeature(error, 'admin-meme-edit')
    adminLogger.error(
      { err: error, memeId: meme.id, bunnyVideoId: videoId },
      'Upload/Algolia failed after DB create, rolling back'
    )
    await rollbackMemeCreation(meme.id)
    throw error
  }

  invalidateAlgoliaCache()

  void logAuditAction({
    action: 'create',
    actingAdminId: adminId,
    targetId: meme.id,
    targetType: 'meme',
    metadata: { title, source: tweetUrl ? 'twitter' : 'upload' }
  })

  adminLogger.info({ memeId: meme.id, tweetUrl }, 'Meme created')

  return { id: meme.id }
}

export const createMemeFromTwitterUrl = createServerFn({ method: 'POST' })
  .inputValidator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url, context }) => {
    const tweetId = z.string().parse(extractTweetIdFromUrl(url))

    const tweet = await getTweetById(tweetId)
    const media = await getTweetMedia(tweet.video.url, tweet.poster.url)

    if (media.video.blob.size > MAX_SIZE_MEME_IN_BYTES) {
      adminLogger.warn(
        { tweetId, size: filesize(media.video.blob.size) },
        'Video size too big from Twitter'
      )
      throw new Error(
        `Video size is too big: ${filesize(media.video.blob.size)}`
      )
    }

    const buffer = Buffer.from(await media.video.blob.arrayBuffer())

    return createMemeWithVideo({
      buffer,
      tweetUrl: tweet.url,
      adminId: context.user.id
    })
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
  .handler(async ({ data: values, context }) => {
    const buffer = Buffer.from(await values.video.arrayBuffer())

    return createMemeWithVideo({ buffer, adminId: context.user.id })
  })

export type AdminMemeRecord = AlgoliaMemeRecord & {
  bookmarkCount: number
}

export const getAdminMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(MEMES_SEARCH_SCHEMA)
  .handler(async ({ data }) => {
    const cacheKey = `admin-memes:${data.query ?? ''}:${data.page ?? 1}:${data.status ?? ''}`

    return withAlgoliaCache(cacheKey, async () => {
      const filters = data.status ? `status:${data.status}` : undefined

      const searchIndex = data.query ? algoliaIndexName : algoliaIndexCreated

      const response =
        await algoliaSearchClient.searchSingleIndex<AlgoliaMemeRecord>({
          indexName: searchIndex,
          searchParams: {
            query: data.query,
            page: data.page ? data.page - 1 : 0,
            hitsPerPage: MEMES_PER_PAGE,
            filters,
            ...ALGOLIA_ADMIN_SEARCH_PARAMS
          }
        })

      const hits = response.hits.map(normalizeAlgoliaHit)
      const memeIds = hits.map((hit) => {
        return hit.id
      })

      const bookmarkCounts = await prismaClient.userBookmark.groupBy({
        by: ['memeId'],
        where: { memeId: { in: memeIds } },
        _count: { id: true }
      })

      const bookmarkCountByMemeId = new Map(
        bookmarkCounts.map((group) => {
          return [group.memeId, group._count.id] as const
        })
      )

      return {
        memes: hits.map((hit) => {
          return {
            ...hit,
            bookmarkCount: bookmarkCountByMemeId.get(hit.id) ?? 0
          } satisfies AdminMemeRecord
        }),
        query: data.query,
        page: response.page,
        totalPages: response.nbPages
      }
    })
  })
