import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import { clientEnv } from '~/env/client'
import { getBunnyHeaders } from '~/lib/bunny'
import { cronLogger } from '~/lib/logger'
import { fetchWithZod } from '~/lib/utils'
import { verifyCronSecret } from '~/utils/cron-auth'

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

  const worker = async (): Promise<void> => {
    if (currentIndex >= items.length) {
      return
    }

    const item = items[currentIndex]
    currentIndex += 1

    if (item !== undefined) {
      await handler(item)
    }

    return worker()
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => {
      return worker()
    }
  )

  await Promise.all(workers)
}

type SyncTitlesFromParams = {
  totalProcessed: number
  cursor?: string
}

const syncTitlesFrom = async ({
  totalProcessed,
  cursor
}: SyncTitlesFromParams): Promise<number> => {
  const memes = await prismaClient.meme.findMany({
    take: BATCH_SIZE,
    ...(cursor === undefined ? {} : { skip: 1, cursor: { id: cursor } }),
    orderBy: { id: 'asc' },
    include: { video: true }
  })

  if (memes.length === 0) {
    return totalProcessed
  }

  await processWithConcurrency({
    items: memes,
    concurrency: CONCURRENCY,
    handler: async (meme) => {
      await updateVideoTitle(meme.video.bunnyId, meme.title)
      log.debug({ title: meme.title }, 'Updated meme title on Bunny')
    }
  })

  const processedCount = totalProcessed + memes.length
  log.info({ totalProcessed: processedCount }, 'Batch processed')

  return syncTitlesFrom({
    totalProcessed: processedCount,
    cursor: memes.at(-1)?.id
  })
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
          const totalProcessed = await syncTitlesFrom({ totalProcessed: 0 })

          log.info({ totalProcessed }, 'Completed')

          return Response.json({ success: true, totalProcessed })
        } catch (error) {
          log.error({ error }, 'Bunny titles sync cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
