/* eslint-disable no-console */
import fs from 'node:fs/promises'
import { prismaClient } from '~/db'
import { logEnvironmentInfo } from './lib/env-guard'

const exportJson = async () => {
  logEnvironmentInfo()

  const [categories, videos, memes, memeCategories, userBookmarks] =
    await Promise.all([
      prismaClient.category.findMany(),
      prismaClient.video.findMany(),
      prismaClient.meme.findMany(),
      prismaClient.memeCategory.findMany(),
      prismaClient.userBookmark.findMany()
    ])

  const data = {
    exportedAt: new Date().toISOString(),
    counts: {
      categories: categories.length,
      videos: videos.length,
      memes: memes.length,
      memeCategories: memeCategories.length,
      userBookmarks: userBookmarks.length
    },
    categories,
    videos,
    memes,
    memeCategories,
    userBookmarks
  }

  await fs.writeFile('./backup.json', JSON.stringify(data, null, 2))

  console.log('Backup exported to ./backup.json')
  console.log(`  Categories: ${categories.length}`)
  console.log(`  Videos: ${videos.length}`)
  console.log(`  Memes: ${memes.length}`)
  console.log(`  MemeCategories: ${memeCategories.length}`)
  console.log(`  UserBookmarks: ${userBookmarks.length}`)

  process.exit(0)
}

void exportJson()
