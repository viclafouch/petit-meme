import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import {
  invalidateAlgoliaCache,
  safeAlgoliaOp,
  syncMemeToAllIndices
} from '~/lib/algolia'
import { getVideoPlayData } from '~/lib/bunny'
import { bunnyLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const WEBHOOK_RESPONSE_SCHEMA = z.object({
  VideoLibraryId: z.number(),
  VideoGuid: z.string(),
  Status: z.number()
})

export const Route = createFileRoute('/api/bunny')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let data: unknown

        try {
          data = await request.json()
        } catch (error) {
          bunnyLogger.error({ err: error }, 'Invalid JSON in webhook body')

          return Response.json({ success: false }, { status: 400 })
        }

        let result: z.infer<typeof WEBHOOK_RESPONSE_SCHEMA>

        try {
          result = WEBHOOK_RESPONSE_SCHEMA.parse(data)
        } catch (error) {
          bunnyLogger.error({ err: error, data }, 'Invalid webhook payload')

          return Response.json({ success: false }, { status: 400 })
        }

        try {
          const videoPlayData = await getVideoPlayData(result.VideoGuid)

          const { meme } = await prismaClient.video.update({
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

          if (meme) {
            await safeAlgoliaOp(syncMemeToAllIndices(meme))
            invalidateAlgoliaCache()
          }

          bunnyLogger.info(
            { videoId: result.VideoGuid, status: result.Status },
            'Video updated via webhook'
          )

          return Response.json({ success: true })
        } catch (error) {
          bunnyLogger.error(
            { err: error, videoId: result.VideoGuid, status: result.Status },
            'Video update failed'
          )
          captureWithFeature(error, 'bunny-webhook')

          return Response.json({ success: false }, { status: 500 })
        }
      }
    }
  }
})
