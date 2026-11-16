import { setTimeout as wait } from 'node:timers/promises'
import { z } from 'zod'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { MemeStatus } from '~/db/generated/prisma/enums'
import { fetchWithZod } from '~/server/http/fetch.server'
import { replaceAllIndicesWithMemes } from '~/server/meme/meme-index.server'
import {
  buildLibraryApiUrl,
  createVideo,
  getBunnyHeaders,
  uploadVideo
} from '~/server/platforms/bunny.server'
import { processWithConcurrency } from '../../scripts/lib/concurrency'
import {
  downloadProductionOriginal,
  type ProductionCategory,
  type ProductionMeme,
  type ProductionSource
} from './production-source'

const UPLOAD_CONCURRENCY = 3
const BUNNY_PAGE_SIZE = 1000
const ENCODING_WAIT = { pollIntervalMs: 10_000, timeoutMs: 2_700_000 } as const
const BUNNY_STATUS = { finished: 4, error: 5, uploadFailed: 6 } as const
const BUNNY_FAILED_STATUSES = new Set<number>([
  BUNNY_STATUS.error,
  BUNNY_STATUS.uploadFailed
])

export const copyCategories = async (categories: ProductionCategory[]) => {
  for (const { translations, ...category } of categories) {
    // oxlint-disable-next-line no-await-in-loop -- sequential creation keeps the production order
    await prismaClient.category.create({
      data: { ...category, translations: { create: translations } }
    })
  }
}

const buildDateShift = (memes: ProductionMeme[]) => {
  const latestPublishedAt = Math.max(
    ...memes.map(({ publishedAt, createdAt }) => {
      return (publishedAt ?? createdAt).getTime()
    })
  )

  return (date: Date) => {
    return new Date(date.getTime() + Date.now() - DAY - latestPublishedAt)
  }
}

type CopyMemesParams = {
  source: ProductionSource
  memes: ProductionMeme[]
  statusById: Map<string, MemeStatus>
}

export const copyMemes = async ({
  source,
  memes,
  statusById
}: CopyMemesParams) => {
  const shiftDate = buildDateShift(memes)

  await processWithConcurrency(
    memes,
    UPLOAD_CONCURRENCY,
    async (meme, index) => {
      const status = statusById.get(meme.id) ?? 'PUBLISHED'
      const original = await downloadProductionOriginal(
        source,
        meme.video.bunnyId
      )
      const { videoId } = await createVideo(meme.title)
      await uploadVideo(videoId, original)

      await prismaClient.meme.create({
        data: {
          id: meme.id,
          title: meme.title,
          description: meme.description,
          keywords: meme.keywords,
          contentLocale: meme.contentLocale,
          tweetUrl: meme.tweetUrl,
          viewCount: meme.viewCount,
          shareCount: meme.shareCount,
          downloadCount: meme.downloadCount,
          status,
          createdAt: shiftDate(meme.createdAt),
          publishedAt:
            status === 'PENDING' || !meme.publishedAt
              ? null
              : shiftDate(meme.publishedAt),
          video: {
            create: { bunnyId: videoId, duration: meme.video.duration }
          },
          translations: { create: meme.translations },
          categories: {
            create: meme.categories.map(({ category }) => {
              return { category: { connect: { slug: category.slug } } }
            })
          }
        }
      })

      console.log(`  [${index + 1}/${memes.length}] ${status} ${meme.title}`)

      return 'copied'
    }
  )
}

const BUNNY_LIBRARY_STATUS_SCHEMA = z.object({
  items: z.array(z.object({ guid: z.string(), status: z.number() }))
})

const readLibraryStatuses = async () => {
  try {
    const { items } = await fetchWithZod(
      BUNNY_LIBRARY_STATUS_SCHEMA,
      buildLibraryApiUrl(`/videos?itemsPerPage=${BUNNY_PAGE_SIZE}`),
      { method: 'GET', headers: getBunnyHeaders() }
    )

    return items
  } catch {
    console.warn('  Bunny did not answer, retrying next round')

    return []
  }
}

const markFinishedVideos = async () => {
  const items = await readLibraryStatuses()
  const failedVideo = items.find(({ status }) => {
    return BUNNY_FAILED_STATUSES.has(status)
  })

  if (failedVideo) {
    throw new Error(`Bunny failed to encode ${failedVideo.guid}`)
  }

  await prismaClient.video.updateMany({
    where: {
      bunnyId: {
        in: items
          .filter(({ status }) => {
            return status === BUNNY_STATUS.finished
          })
          .map(({ guid }) => {
            return guid
          })
      }
    },
    data: { bunnyStatus: BUNNY_STATUS.finished }
  })
}

export const waitForEncodedVideos = async () => {
  const deadline = Date.now() + ENCODING_WAIT.timeoutMs

  while (Date.now() < deadline) {
    // oxlint-disable-next-line no-await-in-loop -- polling waits for Bunny between rounds
    await markFinishedVideos()

    // oxlint-disable-next-line no-await-in-loop -- polling waits for Bunny between rounds
    const encodingCount = await prismaClient.video.count({
      where: { bunnyStatus: { not: BUNNY_STATUS.finished } }
    })

    if (encodingCount === 0) {
      return
    }

    console.log(`  ${encodingCount} videos still encoding`)

    // oxlint-disable-next-line no-await-in-loop -- polling waits for Bunny between rounds
    await wait(ENCODING_WAIT.pollIntervalMs)
  }

  throw new Error('Bunny did not encode every video in time')
}

export const indexPublishedMemes = async () => {
  const memes = await prismaClient.meme.findMany({
    where: { status: 'PUBLISHED' },
    include: MEME_ALGOLIA_INCLUDE
  })

  return replaceAllIndicesWithMemes(memes)
}
