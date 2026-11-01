import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { deleteMemeFiles } from '~/lib/meme-files'

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

describe('deleteMemeFiles', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BUNNY_LIBRARY_ID', '4242')
    vi.stubEnv('BUNNY_ACCESS_KEY', 'stream-access-key')
    vi.stubEnv('BUNNY_STORAGE_API_KEY', 'storage-access-key')
    vi.stubEnv('BUNNY_STORAGE_HOSTNAME', 'storage.bunnycdn.test')
    vi.stubEnv('BUNNY_STORAGE_ZONE_NAME', 'petit-meme')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

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
