import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setResponseStatus } from '@tanstack/react-start/server'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import {
  checkMemeFileExists,
  deleteMemeFiles,
  findMissingMemeFiles,
  serveMemeExport
} from '~/server/meme/meme-file.server'

vi.mock(import('@tanstack/react-start/server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    setResponseStatus: vi.fn<typeof setResponseStatus>()
  }
})

const BUNNY_ID = 'bunny-video-id'
const STREAM_VIDEO_URL = `https://video.bunnycdn.com/library/4242/videos/${BUNNY_ID}`
const MP4_URL = `https://storage.bunnycdn.com/petit-meme/${BUNNY_ID}.mp4`
const MP3_URL = `https://storage.bunnycdn.com/petit-meme/${BUNNY_ID}.mp3`
const FIRST_FRAME_URL = `https://storage.bunnycdn.com/petit-meme-images/${BUNNY_ID}/first-frame.webp`
const ORIGINAL_URL = `https://cdn-test.petit-meme.io/${BUNNY_ID}/original`
const ORIGINAL_ACCESS_KEY = 'original-access-key'

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
  vi.stubEnv('BUNNY_LIBRARY_ID', '4242')
  vi.stubEnv('VITE_BUNNY_HOSTNAME', 'cdn-test.petit-meme.io')
  vi.stubEnv('BUNNY_TOKEN_AUTH_KEY', 'token-auth-key-of-at-least-32-chars')
  vi.stubEnv('BUNNY_ORIGINAL_ACCESS_KEY', ORIGINAL_ACCESS_KEY)
  vi.stubEnv('BUNNY_ACCESS_KEY', 'stream-access-key')
  vi.stubEnv('BUNNY_STORAGE_API_KEY', 'storage-access-key')
  vi.stubEnv('BUNNY_STORAGE_ZONE_NAME', 'petit-meme')
  vi.stubEnv('BUNNY_IMAGES_STORAGE_API_KEY', 'images-storage-access-key')
  vi.stubEnv('BUNNY_IMAGES_STORAGE_ZONE_NAME', 'petit-meme-images')
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

  it('should look for the first frame in the images zone with its own key', async () => {
    const fetchMock = stubBunny({ [FIRST_FRAME_URL]: HTTP_STATUS.NOT_FOUND })

    expect(await checkMemeFileExists(BUNNY_ID, 'first-frame')).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      FIRST_FRAME_URL,
      expect.objectContaining({
        headers: new Headers({
          AccessKey: 'images-storage-access-key',
          Range: 'bytes=0-0'
        })
      })
    )
  })
})

describe('findMissingMemeFiles', () => {
  beforeEach(stubBunnyEnv)
  afterEach(restoreStubs)

  it('should report the MP3 when Bunny Storage only holds the MP4', async () => {
    stubBunny({ [MP3_URL]: HTTP_STATUS.NOT_FOUND })

    expect(await findMissingMemeFiles(BUNNY_ID)).toStrictEqual(['mp3'])
  })

  it('should report the first frame when the images zone misses it', async () => {
    stubBunny({ [FIRST_FRAME_URL]: HTTP_STATUS.NOT_FOUND })

    expect(await findMissingMemeFiles(BUNNY_ID)).toStrictEqual(['first-frame'])
  })

  it('should report nothing when Bunny Storage holds every file', async () => {
    stubBunny()

    expect(await findMissingMemeFiles(BUNNY_ID)).toStrictEqual([])
  })

  it('should report every file when Bunny Storage holds none', async () => {
    stubBunny({
      [MP4_URL]: HTTP_STATUS.NOT_FOUND,
      [MP3_URL]: HTTP_STATUS.NOT_FOUND,
      [FIRST_FRAME_URL]: HTTP_STATUS.NOT_FOUND
    })

    expect(await findMissingMemeFiles(BUNNY_ID)).toStrictEqual([
      'mp4',
      'mp3',
      'first-frame'
    ])
  })
})

describe('deleteMemeFiles', () => {
  beforeEach(stubBunnyEnv)
  afterEach(restoreStubs)

  it('should delete the Stream video, the MP4, the MP3 and the first frame of a Meme', async () => {
    const fetchMock = stubBunny()

    await deleteMemeFiles(BUNNY_ID)

    expect(new Set(readDeletedUrls(fetchMock))).toStrictEqual(
      new Set([STREAM_VIDEO_URL, MP4_URL, MP3_URL, FIRST_FRAME_URL])
    )
  })

  it('should report no undeleted file when Bunny deletes all of them', async () => {
    stubBunny()

    expect(await deleteMemeFiles(BUNNY_ID)).toStrictEqual([])
  })

  it('should count a file Bunny Storage does not hold as deleted', async () => {
    stubBunny({
      [MP4_URL]: HTTP_STATUS.NOT_FOUND,
      [MP3_URL]: HTTP_STATUS.NOT_FOUND,
      [FIRST_FRAME_URL]: HTTP_STATUS.NOT_FOUND
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

describe('serveMemeExport', () => {
  beforeEach(stubBunnyEnv)
  afterEach(restoreStubs)

  it('should serve the MP3 from Bunny Storage as audio/mpeg to a Premium caller', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('mp3-bytes', {
        headers: { 'Content-Type': 'application/octet-stream' }
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await serveMemeExport({
      bunnyId: BUNNY_ID,
      format: 'mp3',
      isPremium: true
    })

    expect(fetchMock).toHaveBeenCalledWith(MP3_URL, expect.anything())
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(await response.text()).toBe('mp3-bytes')
  })

  it('should refuse the MP3 to a non-Premium caller with PREMIUM_REQUIRED', async () => {
    const fetchMock = stubBunny()

    await expect(
      serveMemeExport({ bunnyId: BUNNY_ID, format: 'mp3', isPremium: false })
    ).rejects.toStrictEqual(
      new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
    )
    expect(setResponseStatus).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should serve the original video to a Premium caller asking for the MP4', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('original-bytes')
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await serveMemeExport({
      bunnyId: BUNNY_ID,
      format: 'mp4',
      isPremium: true
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`${ORIGINAL_URL}?token=HS256-`),
      expect.objectContaining({
        headers: new Headers({ 'X-Original-Access-Key': ORIGINAL_ACCESS_KEY })
      })
    )
    expect(await response.text()).toBe('original-bytes')
  })

  it('should serve the watermarked MP4 from Bunny Storage to a non-Premium caller', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('watermarked-bytes')
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await serveMemeExport({
      bunnyId: BUNNY_ID,
      format: 'mp4',
      isPremium: false
    })

    expect(fetchMock).toHaveBeenCalledWith(MP4_URL, expect.anything())
    expect(await response.text()).toBe('watermarked-bytes')
  })

  it('should fall back to the original video when Bunny Storage misses the watermarked MP4', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: HTTP_STATUS.NOT_FOUND })
      )
      .mockResolvedValueOnce(new Response('original-bytes'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await serveMemeExport({
      bunnyId: BUNNY_ID,
      format: 'mp4',
      isPremium: false
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, MP4_URL, expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`${ORIGINAL_URL}?token=`),
      expect.anything()
    )
    expect(await response.text()).toBe('original-bytes')
  })
})
