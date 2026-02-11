/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { z } from 'zod'
import { prismaClient } from '@/db'
import { clientEnv } from '@/env/client'
import { getBunnyHeaders } from '@/lib/bunny'
import { fetchWithZod } from '@/lib/utils'

export const updateVideoTitle = async (videoId: string, title: string) => {
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

const BATCH_SIZE = 500
const CONCURRENCY = 5

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
) {
  let index = 0

  const worker = async () => {
    while (index < items.length) {
      const item = items[index]!
      index += 1
      await fn(item)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    worker
  )

  await Promise.all(workers)
}

const task = async () => {
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

    await processWithConcurrency(memes, CONCURRENCY, async (meme) => {
      await updateVideoTitle(meme.video.bunnyId, meme.title)
      console.log('Updated meme title on bunny.net', meme.title)
    })

    totalProcessed += memes.length
    console.log(`Processed ${totalProcessed} memes`)
    cursor = memes.at(-1)?.id
  }

  console.log(`Done. Total: ${totalProcessed}`)
  process.exit(0)
}

void task()
