import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { waitUntil } from '@vercel/functions'
import { BUNNY_STATUS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import { matchIsPrismaError } from '~/db/prisma-error.server'
import { serverEnv } from '~/env/server.server'
import { bunnyLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { fillMemeDraft } from '~/server/admin/ai-assist/meme-fill.server'
import { syncMemeToAllIndices } from '~/server/meme/meme-index.server'
import { invalidateAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import { safeAlgoliaOp } from '~/server/platforms/algolia.server'
import { getVideoPlayData } from '~/server/platforms/bunny.server'

const WEBHOOK_PAYLOAD_SCHEMA = z.object({
  VideoLibraryId: z.number(),
  VideoGuid: z.string(),
  Status: z.number()
})

const PLAYBACK_STATE_STATUSES: readonly number[] = [
  BUNNY_STATUS.QUEUED,
  BUNNY_STATUS.PROCESSING,
  BUNNY_STATUS.ENCODING,
  BUNNY_STATUS.FINISHED,
  BUNNY_STATUS.RESOLUTION_FINISHED,
  BUNNY_STATUS.FAILED,
  BUNNY_STATUS.VIDEO_DELETED
]

const DRAFT_FILL_STATUSES: readonly number[] = [
  BUNNY_STATUS.FINISHED,
  BUNNY_STATUS.RESOLUTION_FINISHED
]

const buildVideoUpdate = async (videoId: string, status: number) => {
  if (status === BUNNY_STATUS.VIDEO_DELETED) {
    return { bunnyStatus: status }
  }

  const videoPlayData = await getVideoPlayData(videoId)

  return { bunnyStatus: status, duration: videoPlayData.video.length }
}

const matchIsSignedByBunny = (headers: Headers, rawBody: string) => {
  const signature = headers.get('X-BunnyStream-Signature') ?? ''
  const expectedSignature = createHmac(
    'sha256',
    serverEnv.BUNNY_READ_ONLY_API_KEY
  )
    .update(rawBody)
    .digest('hex')

  return (
    headers.get('X-BunnyStream-Signature-Version') === 'v1' &&
    headers.get('X-BunnyStream-Signature-Algorithm') === 'hmac-sha256' &&
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  )
}

export const handleBunnyWebhook = async (request: Request) => {
  const rawBody = await request.text()

  if (!matchIsSignedByBunny(request.headers, rawBody)) {
    bunnyLogger.warn('Webhook rejected: invalid signature')

    return Response.json(
      { success: false },
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }

  let data: unknown

  try {
    data = JSON.parse(rawBody)
  } catch (error) {
    bunnyLogger.error({ error }, 'Invalid JSON in webhook body')

    return Response.json({ success: false }, { status: 400 })
  }

  let result: z.infer<typeof WEBHOOK_PAYLOAD_SCHEMA>

  try {
    result = WEBHOOK_PAYLOAD_SCHEMA.parse(data)
  } catch (error) {
    bunnyLogger.error({ error, data }, 'Invalid webhook payload')

    return Response.json({ success: false }, { status: 400 })
  }

  if (String(result.VideoLibraryId) !== serverEnv.BUNNY_LIBRARY_ID) {
    bunnyLogger.warn(
      { libraryId: result.VideoLibraryId },
      'Webhook rejected: unknown library'
    )

    return Response.json({ success: false }, { status: HTTP_STATUS.FORBIDDEN })
  }

  if (!PLAYBACK_STATE_STATUSES.includes(result.Status)) {
    bunnyLogger.info(
      { videoId: result.VideoGuid, status: result.Status },
      'Webhook ignored: status without effect on playback'
    )

    return Response.json({ success: true })
  }

  try {
    const video = await prismaClient.video.findUnique({
      where: { bunnyId: result.VideoGuid },
      select: { bunnyStatus: true }
    })

    if (!video || video.bunnyStatus >= result.Status) {
      bunnyLogger.info(
        {
          videoId: result.VideoGuid,
          status: result.Status,
          currentStatus: video?.bunnyStatus
        },
        'Webhook ignored: unknown video or stale status'
      )

      return Response.json({ success: true })
    }

    const updatedVideo = await prismaClient.video
      .update({
        where: {
          bunnyId: result.VideoGuid,
          bunnyStatus: { lt: result.Status }
        },
        data: await buildVideoUpdate(result.VideoGuid, result.Status),
        include: {
          meme: {
            include: MEME_ALGOLIA_INCLUDE
          }
        }
      })
      .catch((error: unknown) => {
        if (matchIsPrismaError(error, 'RECORD_NOT_FOUND')) {
          return null
        }

        throw error
      })

    if (!updatedVideo) {
      bunnyLogger.info(
        { videoId: result.VideoGuid, status: result.Status },
        'Webhook ignored: a concurrent webhook applied a newer status'
      )

      return Response.json({ success: true })
    }

    const { meme } = updatedVideo

    if (meme) {
      await safeAlgoliaOp(syncMemeToAllIndices(meme))
      await invalidateAlgoliaCache()
    }

    if (meme && DRAFT_FILL_STATUSES.includes(result.Status)) {
      waitUntil(fillMemeDraft(meme.id))
    }

    bunnyLogger.info(
      { videoId: result.VideoGuid, status: result.Status },
      'Video updated via webhook'
    )

    return Response.json({ success: true })
  } catch (error) {
    bunnyLogger.error(
      { error, videoId: result.VideoGuid, status: result.Status },
      'Video update failed'
    )
    captureWithFeature(error, 'bunny-webhook')

    return Response.json({ success: false }, { status: 500 })
  }
}
