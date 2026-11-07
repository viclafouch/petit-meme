import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaClient } from '~/db'
import { BUNNY_STATUS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { Prisma } from '~/db/generated/prisma/client'
import { syncMemeToAllIndices } from '~/lib/algolia'
import { invalidateAlgoliaCache } from '~/lib/algolia-cache'
import { handleBunnyWebhook } from '~/lib/bunny-webhook'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/algolia'), () => {
  return {
    syncMemeToAllIndices: vi.fn<typeof syncMemeToAllIndices>()
  }
})

vi.mock(import('~/lib/algolia-cache'), () => {
  return {
    invalidateAlgoliaCache: vi.fn<typeof invalidateAlgoliaCache>()
  }
})

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const VIDEO_GUID = 'bunny-video-guid'
const VIDEO_LENGTH_SECONDS = 12
const FINISHED_VIDEO = {
  id: 1,
  bunnyId: VIDEO_GUID,
  duration: 0,
  bunnyStatus: BUNNY_STATUS.FINISHED
}

const postWebhook = (status: number) => {
  return handleBunnyWebhook(
    new Request('https://www.petit-meme.io/api/bunny', {
      method: 'POST',
      body: JSON.stringify({
        VideoLibraryId: 4242,
        VideoGuid: VIDEO_GUID,
        Status: status
      })
    })
  )
}

const stubBunnyPlayData = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return Response.json({ video: { length: VIDEO_LENGTH_SECONDS } })
    })
  )
}

describe('handleBunnyWebhook', () => {
  beforeEach(() => {
    vi.stubEnv('BUNNY_ACCESS_KEY', 'stream-access-key')
    stubBunnyPlayData()
    vi.spyOn(prismaClient.video, 'findUnique').mockResolvedValue(FINISHED_VIDEO)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should update the video only from an older status', async () => {
    const update = vi.spyOn(prismaClient.video, 'update').mockResolvedValue({
      ...FINISHED_VIDEO,
      bunnyStatus: BUNNY_STATUS.RESOLUTION_FINISHED,
      duration: VIDEO_LENGTH_SECONDS
    })

    const response = await postWebhook(BUNNY_STATUS.RESOLUTION_FINISHED)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bunnyId: VIDEO_GUID,
          bunnyStatus: { lt: BUNNY_STATUS.RESOLUTION_FINISHED }
        },
        data: {
          bunnyStatus: BUNNY_STATUS.RESOLUTION_FINISHED,
          duration: VIDEO_LENGTH_SECONDS
        }
      })
    )
  })

  it('should ignore a webhook that lost the race to a newer status', async () => {
    vi.spyOn(prismaClient.video, 'update').mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record was found', {
        code: 'P2025',
        clientVersion: 'test'
      })
    )

    const response = await postWebhook(BUNNY_STATUS.RESOLUTION_FINISHED)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(syncMemeToAllIndices).not.toHaveBeenCalled()
    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should report an unexpected database error', async () => {
    vi.spyOn(prismaClient.video, 'update').mockRejectedValue(
      new Error('Connection reset')
    )

    const response = await postWebhook(BUNNY_STATUS.RESOLUTION_FINISHED)

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
  })

  it('should ignore a stale status without updating', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook(BUNNY_STATUS.FINISHED)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(fetch).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
