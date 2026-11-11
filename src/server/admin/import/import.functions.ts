import { filesize } from 'filesize'
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { HTTP_STATUS } from '~/constants/http'
import {
  DEFAULT_MEME_TITLE,
  MAX_SIZE_MEME_IN_BYTES,
  MEME_ALGOLIA_INCLUDE
} from '~/constants/meme'
import { MEME_FILE_IMPORT_SCHEMA } from '~/constants/meme-form'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { prismaClient } from '~/db/client.server'
import {
  MemeContentLocale as MemeContentLocaleEnum,
  MemeFillStatus,
  MemeStatus
} from '~/db/generated/prisma/enums'
import { adminLogger } from '~/lib/logger'
import { getTweetByUrl, getTweetMedia } from '~/lib/react-tweet'
import { captureWithFeature } from '~/lib/sentry'
import { baseLocale } from '~/paraglide/runtime'
import { logAuditAction } from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import { deleteMemeFiles } from '~/server/meme/meme-file.server'
import { invalidateAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import {
  deleteMemeFromAllIndices,
  safeAlgoliaOp,
  syncMemeToAllIndices
} from '~/server/platforms/algolia.server'
import { createVideo, uploadVideo } from '~/server/platforms/bunny.server'

const TWITTER_MEDIA_HOSTNAME = /^(video|pbs)\.twimg\.com$/u

const TWEET_VIDEO_SCHEMA = z.object({
  videoUrl: z.url({ hostname: TWITTER_MEDIA_HOSTNAME })
})

const throwTwitterUnavailable = (
  error: unknown,
  { url, message }: { url: string; message: string }
) => {
  adminLogger.error({ error, url }, message)
  captureWithFeature(error, 'admin-downloader')

  return throwWithStatus(
    HTTP_STATUS.BAD_GATEWAY,
    new Error(message, { cause: error })
  )
}

const fetchAsBase64 = async (url: string) => {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    return Buffer.from(await response.arrayBuffer()).toString('base64')
  } catch (error) {
    return throwTwitterUnavailable(error, {
      url,
      message: 'Impossible de télécharger le média depuis Twitter'
    })
  }
}

type CreateMemeWithVideoParams = {
  buffer: Buffer<ArrayBuffer>
  adminId: string
  tweetUrl?: string
}

const rollbackMemeCreation = async (memeId: string, bunnyId: string) => {
  await Promise.all([
    prismaClient.meme
      .delete({ where: { id: memeId } })
      .catch((cleanupError: unknown) => {
        adminLogger.error(
          { error: cleanupError, memeId },
          'Failed to rollback meme from DB'
        )
      }),
    safeAlgoliaOp(deleteMemeFromAllIndices(memeId)),
    deleteMemeFiles(bunnyId)
  ])
}

const createMemeWithVideo = async ({
  buffer,
  tweetUrl,
  adminId
}: CreateMemeWithVideoParams) => {
  const title = DEFAULT_MEME_TITLE
  const { videoId } = await createVideo(title)
  let meme

  try {
    meme = await prismaClient.meme.create({
      data: {
        title,
        tweetUrl,
        status: MemeStatus.PENDING,
        fillStatus: MemeFillStatus.WAITING,
        contentLocale: MemeContentLocaleEnum.FR,
        video: {
          create: {
            duration: 0,
            bunnyId: videoId
          }
        },
        translations: {
          create: {
            locale: baseLocale,
            title,
            description: '',
            keywords: []
          }
        }
      },
      include: MEME_ALGOLIA_INCLUDE
    })
  } catch (error) {
    await deleteMemeFiles(videoId)
    throw error
  }

  try {
    await Promise.all([
      safeAlgoliaOp(syncMemeToAllIndices(meme)),
      uploadVideo(videoId, buffer)
    ])
  } catch (error) {
    captureWithFeature(error, 'admin-meme-edit')
    adminLogger.error(
      { error, memeId: meme.id, bunnyVideoId: videoId },
      'Upload/Algolia failed after DB create, rolling back'
    )
    await rollbackMemeCreation(meme.id, videoId)
    throw error
  }

  await invalidateAlgoliaCache()

  void logAuditAction({
    action: 'create',
    actingAdminId: adminId,
    targetId: meme.id,
    targetType: 'meme',
    metadata: {
      title,
      source: tweetUrl ? 'twitter' : 'upload'
    }
  })

  adminLogger.info({ memeId: meme.id, tweetUrl }, 'Meme created')

  return { id: meme.id }
}

export const getTweet = createServerFn({ method: 'GET' })
  .validator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url }) => {
    try {
      return await getTweetByUrl(url)
    } catch (error) {
      return throwTwitterUnavailable(error, {
        url,
        message: 'Impossible de récupérer le tweet'
      })
    }
  })

export const getTweetVideo = createServerFn({ method: 'GET' })
  .validator((data) => {
    return TWEET_VIDEO_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    return fetchAsBase64(data.videoUrl)
  })

export const createMemeFromTweet = createServerFn({ method: 'POST' })
  .validator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url, context }) => {
    const tweet = await getTweetByUrl(url)
    const media = await getTweetMedia(tweet.video.url, tweet.poster.url)
    const videoSize = filesize(media.video.blob.size)

    if (media.video.blob.size > MAX_SIZE_MEME_IN_BYTES) {
      adminLogger.warn(
        { tweetId: tweet.id, size: videoSize },
        'Video size too big from Twitter'
      )

      return throwWithStatus(
        HTTP_STATUS.UNPROCESSABLE_CONTENT,
        new Error(`La vidéo est trop volumineuse : ${videoSize}`)
      )
    }

    return createMemeWithVideo({
      buffer: Buffer.from(await media.video.blob.arrayBuffer()),
      tweetUrl: tweet.url,
      adminId: context.user.id
    })
  })

export const createMemeFromFile = createServerFn({ method: 'POST' })
  .validator((data) => {
    const formData = z.instanceof(FormData).parse(data)

    return MEME_FILE_IMPORT_SCHEMA.parse({
      video: formData.get('video')
    })
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values, context }) => {
    return createMemeWithVideo({
      buffer: Buffer.from(await values.video.arrayBuffer()),
      adminId: context.user.id
    })
  })
