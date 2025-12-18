import { prismaClient } from '@/db'
import {
  algoliaClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'

const task = async () => {
  const memes = await prismaClient.meme.findMany({
    include: {
      video: true,
      categories: {
        include: { category: true }
      }
    }
  })

  await algoliaClient.replaceAllObjects({
    indexName: algoliaIndexName,
    objects: memes.map(memeToAlgoliaRecord)
  })

  process.exit(0)
}

task()
