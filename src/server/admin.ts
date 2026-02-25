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
import type { Prisma } from '@/db/generated/prisma/client'
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
import { auth } from '@/lib/auth'
import { createVideo, deleteVideo, uploadVideo } from '@/lib/bunny'
import { adminLogger, bunnyLogger } from '@/lib/logger'
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

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  banned: true,
  generationCount: true
} as const satisfies Prisma.UserSelect

export type SubscriptionStatus = 'active' | 'past' | 'none'

const SUBSCRIPTION_LIST_SELECT = {
  referenceId: true,
  status: true,
  periodStart: true,
  periodEnd: true
} as const satisfies Prisma.SubscriptionSelect

type SubscriptionRow = Prisma.SubscriptionGetPayload<{
  select: typeof SUBSCRIPTION_LIST_SELECT
}>

export type SubscriptionInfo = {
  status: SubscriptionStatus
  startedAt: SubscriptionRow['periodStart']
  endsAt: SubscriptionRow['periodEnd']
}

export type EnrichedUser = Prisma.UserGetPayload<{
  select: typeof USER_LIST_SELECT
}> & {
  provider: 'twitter' | 'credential'
  subscription: SubscriptionInfo
  memeCount: number
  bookmarkCount: number
  lastActivityAt: Date | null
}

export const getListUsers = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    const users = await prismaClient.user.findMany({
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 500
    })

    const userIds = users.map((user) => {
      return user.id
    })

    const [accounts, subscriptions, memeCounts, bookmarkCounts, lastSessions] =
      await Promise.all([
        prismaClient.account.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, providerId: true }
        }),
        prismaClient.subscription.findMany({
          where: { referenceId: { in: userIds } },
          select: SUBSCRIPTION_LIST_SELECT
        }),
        prismaClient.meme.groupBy({
          by: ['submittedBy'],
          where: { submittedBy: { in: userIds } },
          _count: { id: true }
        }),
        prismaClient.userBookmark.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { id: true }
        }),
        prismaClient.session.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _max: { updatedAt: true }
        })
      ])

    const providerByUserId = new Map(
      accounts.map((account) => {
        return [account.userId, account.providerId] as const
      })
    )

    const subscriptionByUserId = new Map<string, SubscriptionInfo>()

    for (const sub of subscriptions) {
      const current = subscriptionByUserId.get(sub.referenceId)
      const subStatus: SubscriptionStatus =
        sub.status === 'active' ? 'active' : 'past'

      if (!current) {
        subscriptionByUserId.set(sub.referenceId, {
          status: subStatus,
          startedAt: sub.periodStart,
          endsAt: sub.periodEnd
        })
        continue
      }

      if (current.status !== 'active' && subStatus === 'active') {
        current.status = 'active'
      }

      if (
        sub.periodStart &&
        (!current.startedAt || sub.periodStart < current.startedAt)
      ) {
        current.startedAt = sub.periodStart
      }

      if (
        sub.periodEnd &&
        (!current.endsAt || sub.periodEnd > current.endsAt)
      ) {
        current.endsAt = sub.periodEnd
      }
    }

    const memeCountByUserId = new Map(
      memeCounts.map((group) => {
        return [group.submittedBy, group._count.id] as const
      })
    )

    const bookmarkCountByUserId = new Map(
      bookmarkCounts.map((group) => {
        return [group.userId, group._count.id] as const
      })
    )

    const lastActivityByUserId = new Map(
      lastSessions.map((group) => {
        return [group.userId, group._max.updatedAt] as const
      })
    )

    const enrichedUsers = users.map((user) => {
      const provider = providerByUserId.get(user.id)

      return {
        ...user,
        provider: provider === 'twitter' ? 'twitter' : 'credential',
        subscription: subscriptionByUserId.get(user.id) ?? {
          status: 'none',
          startedAt: null,
          endsAt: null
        },
        memeCount: memeCountByUserId.get(user.id) ?? 0,
        bookmarkCount: bookmarkCountByUserId.get(user.id) ?? 0,
        lastActivityAt: lastActivityByUserId.get(user.id) ?? null
      } satisfies EnrichedUser
    })

    return { users: enrichedUsers }
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
      adminLogger.warn({ memeId: values.id }, 'Meme not found for edit')
      throw new Error('Meme not found')
    }

    const publishedAt = resolvePublishedAt(values.status, meme)
    const viewCount = resolveInitialViewCount(values.status, meme)

    const currentCategoryIds = meme.categories.map(({ categoryId }) => {
      return categoryId
    })
    const currentSet = new Set(currentCategoryIds)
    const newSet = new Set(values.categoryIds)
    const toAdd = values.categoryIds.filter((categoryId) => {
      return !currentSet.has(categoryId)
    })
    const toRemove = currentCategoryIds.filter((categoryId) => {
      return !newSet.has(categoryId)
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
  .handler(async ({ data: memeId }) => {
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
        bunnyLogger.error(
          { err: error, bunnyId: meme.video.bunnyId },
          'Failed to delete video from Bunny CDN'
        )
      })
    ])

    invalidateAlgoliaCache()

    adminLogger.info({ memeId: meme.id }, 'Meme deleted')

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
      bunnyLogger.error(
        { err: cleanupError, bunnyVideoId: videoId },
        'Failed to cleanup orphan Bunny video after DB error'
      )
    })
    throw error
  }

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

  adminLogger.info({ memeId: meme.id, tweetUrl }, 'Meme created')

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
      adminLogger.warn(
        { tweetId, size: filesize(media.video.blob.size) },
        'Video size too big from Twitter'
      )
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

export type AdminMemeRecord = AlgoliaMemeRecord & {
  bookmarkCount: number
}

export const getAdminMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(MEMES_SEARCH_SCHEMA)
  .handler(async ({ data }) => {
    const cacheKey = `admin-memes:${data.query ?? ''}:${data.page ?? 1}:${data.status ?? ''}`

    const cached = await withAlgoliaCache(cacheKey, async () => {
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

      return {
        memes: response.hits.map(normalizeAlgoliaHit),
        query: data.query,
        page: response.page,
        totalPages: response.nbPages
      }
    })

    const memeIds = cached.memes.map((meme) => {
      return meme.id
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

    const memes = cached.memes.map((meme) => {
      return {
        ...meme,
        bookmarkCount: bookmarkCountByMemeId.get(meme.id) ?? 0
      } satisfies AdminMemeRecord
    })

    return {
      ...cached,
      memes
    }
  })

export const BAN_REASONS = [
  'Spam',
  'Contenu inapproprié',
  'Harcèlement',
  "Usurpation d'identité",
  'Autre'
] as const satisfies readonly string[]

export type BanReason = (typeof BAN_REASONS)[number]

const BAN_USER_SCHEMA = z.object({
  userId: z.string(),
  banReason: z.enum(BAN_REASONS)
})

export const banUserById = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return BAN_USER_SCHEMA.parse(data)
  })
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      throw new Error('Impossible de vous bannir vous-même')
    }

    const { headers } = getRequest()

    await auth.api.banUser({
      body: {
        userId: data.userId,
        banReason: data.banReason
      },
      headers
    })

    await prismaClient.adminAuditLog.create({
      data: {
        action: 'ban',
        actingAdminId: context.user.id,
        targetId: data.userId,
        targetType: 'user',
        metadata: { banReason: data.banReason }
      }
    })

    adminLogger.info(
      {
        userId: data.userId,
        adminId: context.user.id,
        banReason: data.banReason
      },
      'User banned by admin'
    )

    return { success: true }
  })

export const unbanUserById = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(z.string())
  .handler(async ({ data: userId, context }) => {
    const { headers } = getRequest()

    await auth.api.unbanUser({
      body: { userId },
      headers
    })

    await prismaClient.adminAuditLog.create({
      data: {
        action: 'unban',
        actingAdminId: context.user.id,
        targetId: userId,
        targetType: 'user'
      }
    })

    adminLogger.info(
      { userId, adminId: context.user.id },
      'User unbanned by admin'
    )

    return { success: true }
  })

export const removeUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(z.string())
  .handler(async ({ data: userId, context }) => {
    if (userId === context.user.id) {
      throw new Error('Impossible de supprimer votre propre compte')
    }

    const { headers } = getRequest()

    await auth.api.removeUser({
      body: { userId },
      headers
    })

    await prismaClient.adminAuditLog.create({
      data: {
        action: 'delete',
        actingAdminId: context.user.id,
        targetId: userId,
        targetType: 'user'
      }
    })

    adminLogger.info(
      { userId, adminId: context.user.id },
      'User removed by admin'
    )

    return { success: true }
  })
