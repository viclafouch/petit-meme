import { z } from 'zod'
import { prismaClient } from '~/db'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { safeAlgoliaOp, syncMemeToAllIndices } from '~/lib/algolia'
import { invalidateAlgoliaCache } from '~/lib/algolia-cache'
import { getVideoPlayData } from '~/lib/bunny'
import { bunnyLogger } from '~/lib/logger'
import { matchIsPrismaError } from '~/lib/prisma-error'
import { captureWithFeature } from '~/lib/sentry'

const WEBHOOK_PAYLOAD_SCHEMA = z.object({
  VideoLibraryId: z.number(),
  VideoGuid: z.string(),
  Status: z.number()
})

export const handleBunnyWebhook = async (request: Request) => {
  let data: unknown

  try {
    data = await request.json()
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

    const videoPlayData = await getVideoPlayData(result.VideoGuid)

    const updatedVideo = await prismaClient.video
      .update({
        where: {
          bunnyId: result.VideoGuid,
          bunnyStatus: { lt: result.Status }
        },
        data: {
          bunnyStatus: result.Status,
          duration: videoPlayData.video.length
        },
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
