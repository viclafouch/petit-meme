/* eslint-disable no-console */
import { MEME_ALGOLIA_INCLUDE } from '@/constants/meme'
import { prismaClient } from '@/db'
import {
  replaceAllIndicesWithMemes,
  resolveAlgoliaIndexName
} from '@/lib/algolia'
import { logEnvironmentInfo } from './lib/env-guard'

const reindexMemes = async () => {
  logEnvironmentInfo()

  const memes = await prismaClient.meme.findMany({
    include: MEME_ALGOLIA_INCLUDE
  })

  const results = await replaceAllIndicesWithMemes(memes)

  for (const { locale, count } of results) {
    console.log(`Index ${resolveAlgoliaIndexName(locale)}: ${count} records`)
  }

  process.exit(0)
}

void reindexMemes()
