import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { MemeAlgoliaData } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import {
  buildMemeRecord,
  recommendMemes
} from '~/server/meme/meme-index.server'

const PUBLISHED_AT = new Date('2026-11-01T10:00:00.000Z')
const CACHE_EXPIRES_AT = new Date('2999-01-01T00:00:00.000Z')

const VERTICAL_MEME: MemeAlgoliaData = {
  id: 'meme-vertical',
  title: 'Il a dit quoi ?',
  description: '',
  keywords: [],
  contentLocale: 'FR',
  status: 'PUBLISHED',
  viewCount: 3,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  videoId: 7,
  createdAt: PUBLISHED_AT,
  updatedAt: PUBLISHED_AT,
  publishedAt: PUBLISHED_AT,
  video: {
    id: 7,
    bunnyId: 'bunny-vertical',
    duration: 9,
    width: 1080,
    height: 1920,
    bunnyStatus: 4
  },
  translations: [],
  categories: []
}

const toAlgoliaHit = (record: object) => {
  const storedRecord = JSON.stringify(record)

  return z.json().parse(JSON.parse(storedRecord))
}

const RECOMMEND_PARAMS = {
  cacheKey: 'related:meme-vertical',
  ttl: 1000,
  indexName: 'memes_fr',
  filters: 'status:PUBLISHED',
  maxRecommendations: 6,
  model: 'trending-items'
} as const

const stubCachedHits = (hits: Prisma.JsonValue[]) => {
  vi.spyOn(prismaClient.recommendCache, 'findUnique').mockResolvedValue({
    key: RECOMMEND_PARAMS.cacheKey,
    data: hits,
    expiresAt: CACHE_EXPIRES_AT,
    createdAt: PUBLISHED_AT
  })
}

describe('recommendMemes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should expose the dimensions of each recommended video', async () => {
    stubCachedHits([toAlgoliaHit(buildMemeRecord(VERTICAL_MEME, 'fr'))])

    const [meme] = await recommendMemes(RECOMMEND_PARAMS)

    expect(meme?.video).toMatchObject({ width: 1080, height: 1920 })
  })

  it('should keep a Meme recommended before its dimensions were known', async () => {
    const { width, height, ...videoWithoutDimensions } = VERTICAL_MEME.video
    stubCachedHits([
      toAlgoliaHit({
        ...buildMemeRecord(VERTICAL_MEME, 'fr'),
        video: videoWithoutDimensions
      })
    ])

    const memes = await recommendMemes(RECOMMEND_PARAMS)

    expect(memes).toHaveLength(1)
    expect(memes[0]?.video).toMatchObject({ width: null, height: null })
  })
})
