/* eslint-disable no-console */
import fs from 'node:fs/promises'
import { prismaClient } from '@/db'

export const exportJson = async () => {
  const memes = await prismaClient.meme.findMany({
    include: {
      video: true,
      categories: {
        include: { category: true }
      }
    }
  })

  const categories = await prismaClient.category.findMany()

  const data = {
    categories,
    memes
  }

  await fs.writeFile('./backup.json', JSON.stringify(data, null, 2))

  console.log(
    `${memes.length} memes and ${categories.length} categories exported ✅`
  )

  process.exit(0)
}

// npx vite-node scripts/export-json.ts
exportJson()
