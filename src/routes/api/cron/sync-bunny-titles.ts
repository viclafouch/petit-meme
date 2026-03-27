/* eslint-disable no-await-in-loop */
import { z } from 'zod'
import { prismaClient } from '~/db'
import { clientEnv } from '~/env/client'
import { getBunnyHeaders } from '~/lib/bunny'
import { cronLogger } from '~/lib/logger'
import { fetchWithZod } from '~/lib/utils'
import { verifyCronSecret } from '~/utils/cron-auth'
import { createFileRoute } from '@tanstack/react-router'

const log = cronLogger.child({ job: 'sync-bunny-titles' })

const BATCH_SIZE = 500
const CONCURRENCY = 5

const updateVideoTitle = async (videoId: string, title: string) => {
  return fetchWithZod(
    z.object({ success: z.literal(true) }),
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'POST',
      headers: getBunnyHeaders(),
      body: JSON.stringify({ title })
    }
  )
}

type ConcurrentProcessParams<TItem> = {
  items: TItem[]
  concurrency: number
  handler: (item: TItem) => Promise<void>
}

const processWithConcurrency = async <TItem>({
  items,
  concurrency,
  handler
}: ConcurrentProcessParams<TItem>) => {
  let currentIndex = 0

  const worker = async () => {
    while (currentIndex < items.length) {
      const item = items[currentIndex]
      currentIndex += 1

      if (item) {
        await handler(item)
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => {
      return worker()
    }
  )

  await Promise.all(workers)
}

export const Route = createFileRoute('/api/cron/sync-bunny-titles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret(request)

        if (authError) {
          return authError
        }

        try {
          let cursor: string | undefined
          let totalProcessed = 0

          while (true) {
            const memes = await prismaClient.meme.findMany({
              take: BATCH_SIZE,
              ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
              orderBy: { id: 'asc' },
              include: { video: true }
            })

            if (memes.length === 0) {
              break
            }

            await processWithConcurrency({
              items: memes,
              concurrency: CONCURRENCY,
              handler: async (meme) => {
                await updateVideoTitle(meme.video.bunnyId, meme.title)
                log.debug({ title: meme.title }, 'Updated meme title on Bunny')
              }
            })

            totalProcessed += memes.length
            log.info({ totalProcessed }, 'Batch processed')
            cursor = memes.at(-1)?.id
          }

          log.info({ totalProcessed }, 'Completed')

          return Response.json({ success: true, totalProcessed })
        } catch (error) {
          log.error({ err: error }, 'Bunny titles sync cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
