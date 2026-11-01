import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { checkMemeFileExists, deleteMemeFiles } from '~/lib/meme-files'

const BUNNY_ID = 'bunny-video-id'
const STREAM_VIDEO_URL = `https://video.bunnycdn.com/library/4242/videos/${BUNNY_ID}`
const MP4_URL = `https://storage.bunnycdn.test/petit-meme/${BUNNY_ID}.mp4`
const MP3_URL = `https://storage.bunnycdn.test/petit-meme/${BUNNY_ID}.mp3`

const stubBunny = (statusByUrl: Record<string, number> = {}) => {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const status = statusByUrl[url] ?? HTTP_STATUS.OK

    return Response.json({ success: status === HTTP_STATUS.OK }, { status })
  })
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

const readDeletedUrls = (fetchMock: ReturnType<typeof stubBunny>) => {
  return fetchMock.mock.calls
    .filter(([, init]) => {
      return init?.method === 'DELETE'
    })
    .map(([url]) => {
      return url
    })
}

const stubBunnyEnv = () => {
  vi.stubEnv('VITE_BUNNY_LIBRARY_ID', '4242')
  vi.stubEnv('BUNNY_ACCESS_KEY', 'stream-access-key')
  vi.stubEnv('BUNNY_STORAGE_API_KEY', 'storage-access-key')
  vi.stubEnv('BUNNY_STORAGE_HOSTNAME', 'storage.bunnycdn.test')
  vi.stubEnv('BUNNY_STORAGE_ZONE_NAME', 'petit-meme')
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

const restoreStubs = () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
}

describe('checkMemeFileExists', () => {
  beforeEach(stubBunnyEnv)
  afterEach(restoreStubs)

  it.each([HTTP_STATUS.OK, HTTP_STATUS.PARTIAL_CONTENT])(
    'should find the file when Bunny Storage answers %i',
    async (status) => {
      stubBunny({ [MP3_URL]: status })

      expect(await checkMemeFileExists(BUNNY_ID, 'mp3')).toBe(true)
    }
  )

  it('should miss the file when Bunny Storage answers 404', async () => {
    stubBunny({ [MP3_URL]: HTTP_STATUS.NOT_FOUND })

    expect(await checkMemeFileExists(BUNNY_ID, 'mp3')).toBe(false)
  })

  it.each([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.INTERNAL_SERVER_ERROR])(
    'should throw when Bunny Storage answers %i',
    async (status) => {
      stubBunny({ [MP3_URL]: status })

      await expect(checkMemeFileExists(BUNNY_ID, 'mp3')).rejects.toThrow(
        String(status)
      )
    }
  )
})

describe('deleteMemeFiles', () => {
  beforeEach(stubBunnyEnv)
  afterEach(restoreStubs)

  it('should delete the Stream video, the MP4 and the MP3 of a Meme', async () => {
    const fetchMock = stubBunny()

    await deleteMemeFiles(BUNNY_ID)

    expect(new Set(readDeletedUrls(fetchMock))).toStrictEqual(
      new Set([STREAM_VIDEO_URL, MP4_URL, MP3_URL])
    )
  })

  it('should report no undeleted file when Bunny deletes all of them', async () => {
    stubBunny()

    expect(await deleteMemeFiles(BUNNY_ID)).toStrictEqual([])
  })

  it('should count a file Bunny Storage does not hold as deleted', async () => {
    stubBunny({
      [MP4_URL]: HTTP_STATUS.NOT_FOUND,
      [MP3_URL]: HTTP_STATUS.NOT_FOUND
    })

    expect(await deleteMemeFiles(BUNNY_ID)).toStrictEqual([])
  })

  it('should report each file Bunny failed to delete', async () => {
    stubBunny({
      [STREAM_VIDEO_URL]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      [MP3_URL]: HTTP_STATUS.INTERNAL_SERVER_ERROR
    })

    expect(await deleteMemeFiles(BUNNY_ID)).toStrictEqual(['stream', 'mp3'])
  })
})
