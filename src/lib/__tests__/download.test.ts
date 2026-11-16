import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shareBlob } from '~/lib/download'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/sentry'), () => {
  return {
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const share = vi.fn<(data: ShareData) => Promise<void>>()

describe('shareBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { share })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should share the file with the bare MIME type of its format', async () => {
    share.mockResolvedValueOnce()

    await shareBlob(
      new Blob(['video'], { type: 'video/mp4; codecs=avc1' }),
      'Coucou',
      'mp4'
    )

    expect(share).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        files: [
          expect.objectContaining({ name: 'Coucou.mp4', type: 'video/mp4' })
        ]
      })
    )
  })

  it('should report a share the browser refused', async () => {
    const refusal = new DOMException('Permission denied', 'NotAllowedError')
    share.mockRejectedValueOnce(refusal)

    const wasShared = await shareBlob(new Blob(['sound']), 'Coucou', 'mp3')

    expect(wasShared).toBe(false)
    expect(captureWithFeature).toHaveBeenCalledExactlyOnceWith(refusal, 'share')
  })

  it('should stay silent when the person closes the share sheet', async () => {
    share.mockRejectedValueOnce(
      new DOMException('Share canceled', 'AbortError')
    )

    const wasShared = await shareBlob(new Blob(['sound']), 'Coucou', 'mp3')

    expect(wasShared).toBe(false)
    expect(captureWithFeature).not.toHaveBeenCalled()
  })
})
