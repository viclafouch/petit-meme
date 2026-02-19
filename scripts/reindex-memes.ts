/* eslint-disable no-console */
import { prismaClient } from '@/db'
import {
  algoliaAdminClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'

async function reindexMemes() {
  const memes = await prismaClient.meme.findMany({
    include: {
      video: true,
      categories: {
        include: { category: true }
      }
    }
  })

  const response = await algoliaAdminClient.replaceAllObjects({
    indexName: algoliaIndexName,
    objects: memes.map(memeToAlgoliaRecord)
  })

  console.log(response)
}

// npx vite-node scripts/reindex-memes.ts
void reindexMemes()
