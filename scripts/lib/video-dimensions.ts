import { prismaClient } from '~/db/client.server'
import {
  listLibraryVideos,
  toVideoDimensions
} from '~/server/platforms/bunny.server'
import { processWithConcurrency } from './concurrency'

const CONCURRENCY = 3

type BackfillResult = 'done' | 'to-process' | 'unknown-dimensions' | 'failed'

const buildDimensionsByBunnyId = async () => {
  const libraryVideos = await listLibraryVideos()

  return new Map(
    libraryVideos.flatMap((libraryVideo) => {
      const dimensions = toVideoDimensions(libraryVideo)

      return dimensions ? [[libraryVideo.guid, dimensions] as const] : []
    })
  )
}

export const backfillVideoDimensions = async (dryRun: boolean) => {
  const videos = await prismaClient.video.findMany({
    where: { OR: [{ width: null }, { height: null }] },
    select: { id: true, bunnyId: true },
    orderBy: { id: 'asc' }
  })
  console.log(`Found ${videos.length} videos without dimensions\n`)

  const dimensionsByBunnyId = await buildDimensionsByBunnyId()

  return processWithConcurrency(
    videos,
    CONCURRENCY,
    async ({ id, bunnyId }, index): Promise<BackfillResult> => {
      const prefix = `  [${index + 1}/${videos.length}] ${bunnyId}`
      const dimensions = dimensionsByBunnyId.get(bunnyId)

      if (!dimensions) {
        console.log(`${prefix} unknown-dimensions`)

        return 'unknown-dimensions'
      }

      if (dryRun) {
        console.log(`${prefix} to-process`)

        return 'to-process'
      }

      try {
        await prismaClient.video.update({ where: { id }, data: dimensions })
        console.log(`${prefix} done`)

        return 'done'
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`${prefix} FAILED: ${message}`)

        return 'failed'
      }
    }
  )
}
