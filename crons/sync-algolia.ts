/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { prismaClient } from '@/db'
import {
  algoliaAdminClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'

const BATCH_SIZE = 500

const task = async () => {
  const records = []
  let cursor: string | undefined

  while (true) {
    const memes = await prismaClient.meme.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: {
        video: true,
        categories: {
          include: { category: true }
        }
      }
    })

    if (memes.length === 0) {
      break
    }

    records.push(...memes.map(memeToAlgoliaRecord))

    cursor = memes.at(-1)?.id
  }

  await algoliaAdminClient.replaceAllObjects({
    indexName: algoliaIndexName,
    objects: records
  })

  console.log('Done')

  process.exit(0)
}

void task()
