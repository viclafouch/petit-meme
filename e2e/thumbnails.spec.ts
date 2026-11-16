import { z } from 'zod'
import { type APIRequestContext, expect, test } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { THUMBNAIL_RATIOS, THUMBNAIL_SIZES } from '~/constants/og'
import { E2E_MISSING_MEME_ID, E2E_NAMED_MEMES } from './content'

const SHARED_MEME = E2E_NAMED_MEMES.mostViewed
const MEME_PATHNAME = `/memes/${SHARED_MEME.id}`

const JSON_LD_PATTERN =
  /<script type="application\/ld\+json">(?<json>[\s\S]*?)<\/script>/gu

const GRAPH_SCHEMA = z.object({
  '@graph': z.array(z.looseObject({ '@type': z.string() }))
})

const VIDEO_OBJECT_SCHEMA = z.looseObject({
  '@type': z.literal('VideoObject'),
  thumbnailUrl: z.array(z.string())
})

const readVideoThumbnailUrls = async (request: APIRequestContext) => {
  const response = await request.get(MEME_PATHNAME)
  const html = await response.text()

  const nodes = [...html.matchAll(JSON_LD_PATTERN)].flatMap((match) => {
    const graph = GRAPH_SCHEMA.safeParse(JSON.parse(match.groups?.json ?? '{}'))

    return graph.success ? graph.data['@graph'] : []
  })
  const videoObject = VIDEO_OBJECT_SCHEMA.parse(
    nodes.find((node) => {
      return node['@type'] === 'VideoObject'
    })
  )

  return { html, thumbnailUrls: videoObject.thumbnailUrl }
}

test.describe('the video thumbnails Google reads', () => {
  test('the raw thumbnail leads, and matches the sitemap and any poster', async ({
    request
  }) => {
    const { html, thumbnailUrls } = await readVideoThumbnailUrls(request)
    const [rawThumbnailUrl] = thumbnailUrls
    const sitemap = await request.get('/sitemap-memes.xml')

    expect(thumbnailUrls).toHaveLength(THUMBNAIL_RATIOS.length + 1)
    expect(await sitemap.text()).toContain(
      `<video:thumbnail_loc>${rawThumbnailUrl}</video:thumbnail_loc>`
    )
    const otherPosterUrls = Array.from(
      html.matchAll(/ poster="([^"]+)"/gu),
      ([, posterUrl]) => {
        return posterUrl
      }
    ).filter((posterUrl) => {
      return posterUrl !== rawThumbnailUrl
    })

    expect(otherPosterUrls).toStrictEqual([])
  })

  for (const [index, ratio] of THUMBNAIL_RATIOS.entries()) {
    test(`the ${ratio} thumbnail is a JPEG of its declared size`, async ({
      page,
      request
    }) => {
      const { thumbnailUrls } = await readVideoThumbnailUrls(request)
      const thumbnailUrl = thumbnailUrls[index + 1] ?? ''

      const response = await page.goto(thumbnailUrl)
      const size = await page
        .getByRole('img')
        .evaluate((image: HTMLImageElement) => {
          return { width: image.naturalWidth, height: image.naturalHeight }
        })

      expect(thumbnailUrl).toContain(`ratio=${ratio}`)
      expect(response?.headers()['content-type']).toBe('image/jpeg')
      expect(size).toStrictEqual(THUMBNAIL_SIZES[ratio])
    })
  }

  test('a Meme that is not Published gets no thumbnail', async ({
    request
  }) => {
    const response = await request.get(
      `/api/og?type=thumbnail&id=${E2E_MISSING_MEME_ID}&ratio=16x9`
    )

    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
