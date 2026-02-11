import { z } from 'zod'
import { prismaClient } from '@/db'
import {
  algoliaClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'
import { getVideoPlayData } from '@/lib/bunny'
import { createFileRoute } from '@tanstack/react-router'

// see https://docs.bunny.net/docs/stream-webhook
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
                include: {
                  video: true,
                  categories: {
                    include: {
                      category: true
                    }
                  }
                }
              }
            }
          })

          if (meme) {
            await algoliaClient
              .partialUpdateObject({
                indexName: algoliaIndexName,
                objectID: meme.id,
                attributesToUpdate: memeToAlgoliaRecord(meme)
              })
              .catch((error) => {
                // eslint-disable-next-line no-console
                console.error(error)
              })
          }

          // eslint-disable-next-line no-console
          console.log('Vidéo mise à jour !', {
            videoId: result.VideoGuid,
            status: result.Status
          })

          return Response.json({ success: true })
        } catch (_error) {
          // eslint-disable-next-line no-console
          console.log('Mise à jour non effectuée', {
            videoId: result.VideoGuid,
            status: result.Status
          })

          return Response.json({ success: true })
        }
      }
    }
  }
})
