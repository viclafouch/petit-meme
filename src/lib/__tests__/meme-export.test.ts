import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendConversionEvent } from '~/lib/algolia-insights'
import { downloadBlob, matchIsBlobShareable, shareBlob } from '~/lib/download'
import { deliverMemeExport, shareOrDownloadBlob } from '~/lib/meme-export'
import type {
  getMemeExportFile,
  recordMemeExport
} from '~/server/meme/meme.functions'

vi.mock(import('~/lib/algolia-insights'), () => {
  return {
    sendConversionEvent: vi.fn<typeof sendConversionEvent>()
  }
})

vi.mock(import('~/server/meme/meme.functions'), () => {
  return {
    getMemeExportFile: vi.fn<typeof getMemeExportFile>(),
    recordMemeExport: vi.fn<typeof recordMemeExport>()
  }
})

vi.mock(import('~/lib/download'), () => {
  return {
    downloadBlob: vi.fn<typeof downloadBlob>(),
    matchIsBlobShareable: vi.fn<typeof matchIsBlobShareable>(() => {
      return true
    }),
    shareBlob: vi.fn<typeof shareBlob>(async () => {
      return true
    })
  }
})

const MEME = { id: 'meme-1', title: 'Coucou' }
const BLOB = new Blob(['sound'], { type: 'audio/mpeg' })

describe('deliverMemeExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send one conversion named after the format when a download is delivered', async () => {
    await deliverMemeExport({
      blob: BLOB,
      meme: MEME,
      mode: 'download',
      format: 'mp3',
      tracking: { queryID: 'query-1', authenticatedUserToken: 'user-1' }
    })

    expect(sendConversionEvent).toHaveBeenCalledExactlyOnceWith({
      eventName: 'Meme MP3 Downloaded',
      objectID: 'meme-1',
      queryID: 'query-1',
      authenticatedUserToken: 'user-1'
    })
  })

  it('should send no conversion when the native share is cancelled', async () => {
    vi.mocked(shareBlob).mockResolvedValueOnce(false)

    await deliverMemeExport({
      blob: BLOB,
      meme: MEME,
      mode: 'share',
      format: 'mp4',
      tracking: {}
    })

    expect(sendConversionEvent).not.toHaveBeenCalled()
  })

  it('should send a conversion without queryID when the Meme was opened outside a search', async () => {
    await deliverMemeExport({
      blob: BLOB,
      meme: MEME,
      mode: 'share',
      format: 'mp4',
      tracking: {}
    })

    expect(sendConversionEvent).toHaveBeenCalledExactlyOnceWith({
      eventName: 'Meme MP4 Shared',
      objectID: 'meme-1'
    })
  })

  it('should name the conversion a download when the share falls back to a download', async () => {
    vi.mocked(matchIsBlobShareable).mockReturnValueOnce(false)

    await deliverMemeExport({
      blob: BLOB,
      meme: MEME,
      mode: 'share',
      format: 'mp3',
      tracking: {}
    })

    expect(sendConversionEvent).toHaveBeenCalledExactlyOnceWith({
      eventName: 'Meme MP3 Downloaded',
      objectID: 'meme-1'
    })
  })
})

describe('shareOrDownloadBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should download the file when the browser cannot share it', async () => {
    vi.mocked(matchIsBlobShareable).mockReturnValueOnce(false)

    const deliveredMode = await shareOrDownloadBlob({
      blob: BLOB,
      title: 'Coucou',
      mode: 'share',
      format: 'mp4'
    })

    expect(deliveredMode).toBe('download')
    expect(shareBlob).not.toHaveBeenCalled()
    expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(BLOB, 'Coucou.mp4')
  })
})
