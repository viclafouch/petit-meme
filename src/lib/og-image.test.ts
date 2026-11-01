import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  HTTP_STATUS,
  IMMUTABLE_CACHE_CONTROL,
  NO_STORE_CACHE_CONTROL
} from '~/constants/http'
import { renderOgImage } from '~/lib/og-image'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const UNREACHABLE_FONT_URL = 'http://127.0.0.1:1/missing-font.ttf'

const PNG_SIGNATURE = /^\x89PNG/u

const renderBrokenOgImage = () => {
  return renderOgImage({
    template: createElement('div'),
    fontUrls: [UNREACHABLE_FONT_URL]
  })
}

describe('renderOgImage', () => {
  it('should answer a failed render with an uncached 500', async () => {
    const response = await renderBrokenOgImage()

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(response.headers.get('Cache-Control')).toBe(NO_STORE_CACHE_CONTROL)
  })

  it('should report a failed render to Sentry', async () => {
    await renderBrokenOgImage()

    expect(captureWithFeature).toHaveBeenCalledWith(
      expect.any(Error),
      'og-image'
    )
  })

  it('should answer a successful render with an immutable PNG', async () => {
    const response = await renderOgImage({
      template: createElement('div'),
      fontUrls: []
    })
    const image = Buffer.from(await response.arrayBuffer()).toString('latin1')

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe(IMMUTABLE_CACHE_CONTROL)
    expect(image).toMatch(PNG_SIGNATURE)
  })
})
