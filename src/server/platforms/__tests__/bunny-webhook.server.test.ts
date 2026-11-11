import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BUNNY_STATUS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import { captureWithFeature } from '~/lib/sentry'
import { fillMemeDraft } from '~/server/admin/ai-assist/meme-fill.server'
import { syncMemeToAllIndices } from '~/server/meme/meme-index.server'
import { invalidateAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import { handleBunnyWebhook } from '~/server/platforms/bunny-webhook.server'

vi.mock(import('~/server/meme/meme-index.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    syncMemeToAllIndices: vi.fn<typeof syncMemeToAllIndices>()
  }
})

vi.mock(
  import('~/server/platforms/algolia-cache.server'),
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      invalidateAlgoliaCache: vi.fn<typeof invalidateAlgoliaCache>()
    }
  }
)

vi.mock(import('~/server/admin/ai-assist/meme-fill.server'), () => {
  return {
    fillMemeDraft: vi.fn<typeof fillMemeDraft>()
  }
})

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const VIDEO_GUID = 'bunny-video-guid'
const MEME_ID = 'meme-id'
const VIDEO_LENGTH_SECONDS = 12
const FINISHED_VIDEO = {
  id: 1,
  bunnyId: VIDEO_GUID,
  duration: 0,
  bunnyStatus: BUNNY_STATUS.FINISHED
}

const LIBRARY_ID = 4242
const READ_ONLY_API_KEY = 'stream-read-only-key'
const SIGNATURE_HEX_LENGTH = 64

type PostWebhookParams = {
  status: number
  libraryId?: number
  signature?: string | null
}

const postWebhook = ({
  status,
  libraryId = LIBRARY_ID,
  signature
}: PostWebhookParams) => {
  const body = JSON.stringify({
    VideoLibraryId: libraryId,
    VideoGuid: VIDEO_GUID,
    Status: status
  })
  const headers = new Headers({
    'X-BunnyStream-Signature-Version': 'v1',
    'X-BunnyStream-Signature-Algorithm': 'hmac-sha256'
  })
  const resolvedSignature =
    signature === undefined
      ? createHmac('sha256', READ_ONLY_API_KEY).update(body).digest('hex')
      : signature

  if (resolvedSignature !== null) {
    headers.set('X-BunnyStream-Signature', resolvedSignature)
  }

  return handleBunnyWebhook(
    new Request('https://www.petit-meme.io/api/bunny', {
      method: 'POST',
      headers,
      body
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
    vi.stubEnv('BUNNY_READ_ONLY_API_KEY', READ_ONLY_API_KEY)
    vi.stubEnv('BUNNY_LIBRARY_ID', String(LIBRARY_ID))
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

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED
    })

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

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED
    })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(syncMemeToAllIndices).not.toHaveBeenCalled()
    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should report an unexpected database error', async () => {
    vi.spyOn(prismaClient.video, 'update').mockRejectedValue(
      new Error('Connection reset')
    )

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED
    })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
  })

  it('should ignore a stale status without updating', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook({ status: BUNNY_STATUS.FINISHED })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(fetch).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('should ignore a status without effect on playback', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook({
      status: BUNNY_STATUS.CAPTIONS_GENERATED
    })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(fetch).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('should record a video Bunny deleted without reading its play data', async () => {
    const update = vi.spyOn(prismaClient.video, 'update').mockResolvedValue({
      ...FINISHED_VIDEO,
      bunnyStatus: BUNNY_STATUS.VIDEO_DELETED
    })

    const response = await postWebhook({ status: BUNNY_STATUS.VIDEO_DELETED })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(fetch).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bunnyId: VIDEO_GUID,
          bunnyStatus: { lt: BUNNY_STATUS.VIDEO_DELETED }
        },
        data: { bunnyStatus: BUNNY_STATUS.VIDEO_DELETED }
      })
    )
  })

  it('should reject a webhook without a signature', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED,
      signature: null
    })

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(update).not.toHaveBeenCalled()
  })

  it('should reject a webhook signed with another key', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED,
      signature: 'a'.repeat(SIGNATURE_HEX_LENGTH)
    })

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(update).not.toHaveBeenCalled()
  })

  it('should reject a signed webhook from another library', async () => {
    const update = vi.spyOn(prismaClient.video, 'update')

    const response = await postWebhook({
      status: BUNNY_STATUS.RESOLUTION_FINISHED,
      libraryId: 1
    })

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    expect(update).not.toHaveBeenCalled()
  })

  it.each([BUNNY_STATUS.FINISHED, BUNNY_STATUS.RESOLUTION_FINISHED])(
    'should start the draft fill of the Meme when Bunny reports status %i',
    async (status) => {
      vi.spyOn(prismaClient.video, 'findUnique').mockResolvedValue({
        ...FINISHED_VIDEO,
        bunnyStatus: BUNNY_STATUS.ENCODING
      })
      const finishedVideo = {
        ...FINISHED_VIDEO,
        bunnyStatus: status,
        meme: { id: MEME_ID }
      }
      vi.spyOn(prismaClient.video, 'update').mockResolvedValue(finishedVideo)

      await postWebhook({ status })

      expect(fillMemeDraft).toHaveBeenCalledExactlyOnceWith(MEME_ID)
    }
  )

  it('should not start the draft fill before Bunny finishes the video', async () => {
    vi.spyOn(prismaClient.video, 'findUnique').mockResolvedValue({
      ...FINISHED_VIDEO,
      bunnyStatus: BUNNY_STATUS.QUEUED
    })
    const encodingVideo = {
      ...FINISHED_VIDEO,
      bunnyStatus: BUNNY_STATUS.ENCODING,
      meme: { id: MEME_ID }
    }
    vi.spyOn(prismaClient.video, 'update').mockResolvedValue(encodingVideo)

    await postWebhook({ status: BUNNY_STATUS.ENCODING })

    expect(fillMemeDraft).not.toHaveBeenCalled()
  })
})
