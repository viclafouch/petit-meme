import { z } from 'zod'
import { MEME_FULL_INCLUDE } from '@/constants/meme'
import { prismaClient } from '@/db'
import {
  algoliaAdminClient,
  algoliaIndexName,
  invalidateAlgoliaCache,
  memeToAlgoliaRecord,
  safeAlgoliaOp
} from '@/lib/algolia'
import { getVideoPlayData } from '@/lib/bunny'
import { bunnyLogger } from '@/lib/logger'
import { createFileRoute } from '@tanstack/react-router'

const WEBHOOK_RESPONSE_SCHEMA = z.object({
  VideoLibraryId: z.number(),
  VideoGuid: z.string(),
  Status: z.number()
})

export const Route = createFileRoute('/api/bunny')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const data = await request.json()
        const result = WEBHOOK_RESPONSE_SCHEMA.parse(data)

        const videoPlayData = await getVideoPlayData(result.VideoGuid)

        try {
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
                include: MEME_FULL_INCLUDE
              }
            }
          })

          if (meme) {
            await safeAlgoliaOp(
              algoliaAdminClient.partialUpdateObject({
                indexName: algoliaIndexName,
                objectID: meme.id,
                attributesToUpdate: memeToAlgoliaRecord(meme)
              })
            )

            invalidateAlgoliaCache()
          }

          bunnyLogger.info(
            { videoId: result.VideoGuid, status: result.Status },
            'Video updated via webhook'
          )

          return Response.json({ success: true })
        } catch {
          bunnyLogger.debug(
            { videoId: result.VideoGuid, status: result.Status },
            'Video update skipped'
          )

          return Response.json({ success: true })
        }
      }
    }
  }
})
