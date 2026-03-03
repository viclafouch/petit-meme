/* eslint-disable no-console */
import { prismaClient } from '@/db'
import {
  algoliaAdminClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'
import { logEnvironmentInfo } from './lib/env-guard'

const reindexMemes = async () => {
  logEnvironmentInfo()

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

void reindexMemes()
