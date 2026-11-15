import { createElement } from 'react'
import { render } from 'takumi-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { captureWithFeature } from '~/lib/sentry'
import {
  renderHomeOgImage,
  renderMemeOgImage,
  renderPageOgImage
} from '~/server/seo/og-image.server'

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const NOT_AN_IMAGE = new TextEncoder().encode('<html>Not found</html>')

const PNG_SIGNATURE = /^\x89PNG/u
const JPEG_SIGNATURE = /^\xFF\xD8\xFF/u
const ONE_DAY_CDN_TTL = 'max-age=86400'
const ONE_YEAR_CDN_TTL = 'max-age=31536000'

const readSignature = async (response: Response) => {
  return Buffer.from(await response.arrayBuffer()).toString('latin1')
}

const renderPortraitThumbnail = () => {
  return render(
    createElement('div', {
      style: { width: '100%', height: '100%', backgroundColor: '#e11d48' }
    }),
    { width: 720, height: 1280, format: 'jpeg' }
  )
}

describe('the share images', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render a page image from the bundle, without a request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await renderHomeOgImage('en')

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(await readSignature(response)).toMatch(PNG_SIGNATURE)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should render a titled page image the CDN keeps for a year', async () => {
    const response = await renderPageOgImage({
      title: 'Reaction memes',
      subtitle: 'Every reaction meme, ready to share'
    })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      ONE_YEAR_CDN_TTL
    )
    expect(await readSignature(response)).toMatch(PNG_SIGNATURE)
  })

  it('should render a Meme image as a JPEG the CDN keeps for a day', async () => {
    const thumbnail = await renderPortraitThumbnail()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await renderMemeOgImage(thumbnail)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      ONE_DAY_CDN_TTL
    )
    expect(await readSignature(response)).toMatch(JPEG_SIGNATURE)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should answer a thumbnail that fails to render with a 500 the CDN never keeps', async () => {
    const response = await renderMemeOgImage(NOT_AN_IMAGE)

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store')
    expect(captureWithFeature).toHaveBeenCalledWith(
      expect.any(Error),
      'og-image'
    )
  })
})
