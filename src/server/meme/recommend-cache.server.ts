import { z } from 'zod'
import { createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { algoliaLogger } from '~/lib/logger'

type WriteRecommendCacheParams = {
  key: string
  data: Prisma.InputJsonValue
  ttl: number
}

const CACHED_MEME_IDS_SCHEMA = z.array(z.string())

export const readRecommendCache = createServerOnlyFn(async (key: string) => {
  const cached = await prismaClient.recommendCache.findUnique({
    where: { key },
    select: { data: true, expiresAt: true }
  })

  if (!cached || cached.expiresAt <= new Date()) {
    return null
  }

  return cached.data
})

const deleteExpiredRecommendCache = async () => {
  try {
    await prismaClient.recommendCache.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })
  } catch (error) {
    algoliaLogger.warn({ error }, 'Failed to delete expired recommend cache')
  }
}

export const writeRecommendCache = createServerOnlyFn(
  async ({ key, data, ttl }: WriteRecommendCacheParams) => {
    try {
      const expiresAt = new Date(Date.now() + ttl)

      await prismaClient.recommendCache.upsert({
        where: { key },
        update: { data, expiresAt },
        create: { key, data, expiresAt }
      })

      void deleteExpiredRecommendCache()
    } catch (error) {
      algoliaLogger.warn({ error, key }, 'Failed to write recommend cache')
    }
  }
)

export const readCachedMemeIds = createServerOnlyFn(async (key: string) => {
  const parsedIds = CACHED_MEME_IDS_SCHEMA.safeParse(
    await readRecommendCache(key)
  )

  return parsedIds.success ? parsedIds.data : null
})

export const clearRecommendCache = createServerOnlyFn(async () => {
  try {
    await prismaClient.recommendCache.deleteMany()
  } catch (error) {
    algoliaLogger.warn({ error }, 'Failed to clear recommend cache')
  }
})
