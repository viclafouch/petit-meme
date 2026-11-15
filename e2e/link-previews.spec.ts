import { z } from 'zod'
import {
  type APIRequestContext,
  expect,
  type Page,
  test
} from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { BYTES_PER_KILOBYTE } from '~/constants/number'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { locales } from '~/paraglide/runtime'
import { E2E_MISSING_MEME_ID, E2E_NAMED_MEMES } from './content'
import { E2E_BUNNY_HOSTNAME } from './env'
import { buildE2eUrl, localizePathname } from './urls'

const PUBLIC_PATHNAMES = [
  '/',
  '/pricing',
  '/memes/category/all',
  '/memes/category/chats',
  '/memes/ai-search',
  '/submit',
  '/app',
  '/reels',
  '/dmca',
  '/mentions-legales',
  '/privacy',
  '/terms-of-use'
] as const satisfies readonly `/${string}`[]

const SHARED_MEME = E2E_NAMED_MEMES.mostViewed
const MEME_PATHNAME = `/memes/${SHARED_MEME.id}`

const WHATSAPP_MAX_IMAGE_KILOBYTES = 600
const WHATSAPP_MAX_IMAGE_BYTES =
  WHATSAPP_MAX_IMAGE_KILOBYTES * BYTES_PER_KILOBYTE

const HTML_ENTITIES = new Map([
  ['&amp;', '&'],
  ['&quot;', '"'],
  ['&#x27;', "'"],
  ['&#39;', "'"],
  ['&lt;', '<'],
  ['&gt;', '>']
])

const OEMBED_PLAYER_SCHEMA = z.object({
  version: z.literal('1.0'),
  type: z.literal('video'),
  html: z.string()
})

const decodeHtmlEntities = (value: string) => {
  return value.replaceAll(/&(?:amp|quot|#x27|#39|lt|gt);/gu, (entity) => {
    return HTML_ENTITIES.get(entity) ?? entity
  })
}

const readMetaContent = (html: string, key: string) => {
  const match = new RegExp(
    `<meta (?:property|name)="${key}" content="([^"]*)"`,
    'u'
  ).exec(html)

  return decodeHtmlEntities(match?.[1] ?? '')
}

const readOembedHref = (html: string) => {
  const match =
    /<link rel="alternate" type="application\/json\+oembed" href="([^"]+)"/u.exec(
      html
    )

  return decodeHtmlEntities(match?.[1] ?? '')
}

const readDeclaredImage = async (
  request: APIRequestContext,
  pathname: string
) => {
  const response = await request.get(pathname)
  const html = await response.text()

  return {
    url: readMetaContent(html, 'og:image'),
    twitterUrl: readMetaContent(html, 'twitter:image'),
    type: readMetaContent(html, 'og:image:type'),
    width: Number(readMetaContent(html, 'og:image:width')),
    height: Number(readMetaContent(html, 'og:image:height')),
    alt: readMetaContent(html, 'og:image:alt')
  }
}

const readServedImage = async (page: Page, url: string) => {
  const response = await page.goto(url)
  const body = await response?.body()
  const size = await page
    .getByRole('img')
    .evaluate((image: HTMLImageElement) => {
      return { width: image.naturalWidth, height: image.naturalHeight }
    })

  return {
    status: response?.status(),
    type: response?.headers()['content-type'],
    bytes: body?.byteLength ?? 0,
    ...size
  }
}

const expectTruthfulImage = async (
  page: Page,
  request: APIRequestContext,
  pathname: string
) => {
  const declared = await readDeclaredImage(request, pathname)
  const { bytes, ...served } = await readServedImage(page, declared.url)

  expect(declared.alt).not.toBe('')
  expect(declared.twitterUrl).toBe(declared.url)
  expect(declared).toMatchObject({
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT
  })
  expect(served).toStrictEqual({
    status: HTTP_STATUS.OK,
    type: declared.type,
    width: declared.width,
    height: declared.height
  })
  expect(bytes).toBeLessThan(WHATSAPP_MAX_IMAGE_BYTES)
}

test.describe('the link previews', () => {
  for (const locale of locales) {
    for (const pathname of PUBLIC_PATHNAMES) {
      test(`${pathname} in ${locale} declares the image it serves`, async ({
        page,
        request
      }) => {
        await expectTruthfulImage(
          page,
          request,
          localizePathname(pathname, locale)
        )
      })
    }

    test(`a Meme page in ${locale} shares its play-button image`, async ({
      page,
      request
    }) => {
      await expectTruthfulImage(
        page,
        request,
        localizePathname(MEME_PATHNAME, locale)
      )
    })

    test(`a Meme page in ${locale} keeps every video URL out of its tags`, async ({
      request
    }) => {
      const response = await request.get(
        localizePathname(MEME_PATHNAME, locale)
      )
      const html = await response.text()

      expect(html).not.toContain('og:video')
      expect(readMetaContent(html, 'og:image')).not.toContain(
        E2E_BUNNY_HOSTNAME
      )
    })

    test(`a Meme page in ${locale} offers its /embed player through oEmbed`, async ({
      request
    }) => {
      const page = await request.get(localizePathname(MEME_PATHNAME, locale))
      const oembed = await request.get(readOembedHref(await page.text()))
      const embedUrl = buildE2eUrl(`/embed/${SHARED_MEME.id}`, locale)
      const player = OEMBED_PLAYER_SCHEMA.parse(await oembed.json())

      const embed = await request.get(embedUrl)

      expect(player.html).toContain(`<iframe src="${embedUrl}"`)
      expect(embed.status()).toBe(HTTP_STATUS.OK)
    })
  }

  test('a Meme that is not Published gets no image', async ({ request }) => {
    const response = await request.get(
      `/api/og?type=meme&id=${E2E_MISSING_MEME_ID}`
    )

    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND)
  })

  test('a Meme that is not Published gets no oEmbed answer', async ({
    request
  }) => {
    const response = await request.get('/api/oembed', {
      params: {
        url: buildE2eUrl(`/memes/${E2E_MISSING_MEME_ID}`, 'fr'),
        format: 'json'
      }
    })

    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
