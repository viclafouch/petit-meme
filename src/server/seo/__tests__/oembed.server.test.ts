import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import {
  MemeContentLocale,
  MemeFillStatus,
  MemeStatus
} from '~/db/generated/prisma/enums'
import type { MemeModel } from '~/db/generated/prisma/models'
import type { Locale } from '~/paraglide/runtime'
import { respondToOembedRequest } from '~/server/seo/oembed.server'

const PUBLISHED_AT = new Date('2026-01-02T00:00:00Z')

const MEME_RECORD = {
  id: 'meme-id',
  title: 'Titre du mème',
  videoId: 1,
  viewCount: 10,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  description: '',
  keywords: [],
  contentLocale: MemeContentLocale.FR,
  createdAt: PUBLISHED_AT,
  updatedAt: PUBLISHED_AT,
  publishedAt: PUBLISHED_AT,
  status: MemeStatus.PUBLISHED,
  fillStatus: MemeFillStatus.NONE,
  fillAttempts: 0,
  fillDoubt: '',
  fillSuggestion: null
} as const satisfies MemeModel

const buildPublishedMeme = (frenchTitle: string) => {
  return {
    ...MEME_RECORD,
    title: frenchTitle,
    translations: [
      { locale: 'fr', title: frenchTitle, description: '' },
      { locale: 'en', title: 'Meme title', description: '' }
    ]
  }
}

const PUBLISHED_MEME = buildPublishedMeme('Titre du mème')

const OEMBED_PLAYER_SCHEMA = z.object({ html: z.string() })

const readPlayerHtml = (body: unknown) => {
  return OEMBED_PLAYER_SCHEMA.parse(body).html
}

const NOT_A_MEME_PAGE_URLS = [
  'https://example.com/memes/meme-id',
  'https://www.petit-meme.io/pricing',
  'not a url'
] as const satisfies readonly string[]

const MEME_PAGE_URL_BY_LOCALE = {
  fr: 'https://www.petit-meme.io/memes/meme-id',
  en: 'https://www.petit-meme.io/en/memes/meme-id'
} as const satisfies Record<Locale, string>

const EXPECTED_BY_LOCALE = {
  fr: {
    title: 'Titre du mème',
    embedUrl: 'https://www.petit-meme.io/embed/meme-id'
  },
  en: {
    title: 'Meme title',
    embedUrl: 'https://www.petit-meme.io/en/embed/meme-id'
  }
} as const satisfies Record<Locale, { title: string; embedUrl: string }>

const stubPublishedMeme = (meme: typeof PUBLISHED_MEME | null) => {
  return vi.spyOn(prismaClient.meme, 'findFirst').mockResolvedValue(meme)
}

const requestOembed = (params: Record<string, string>) => {
  const url = new URL('https://www.petit-meme.io/api/oembed')

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return respondToOembedRequest(url)
}

describe('the oEmbed endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(['fr', 'en'] as const)(
    'should answer a Published Meme page with its /embed player, in %s',
    async (locale) => {
      stubPublishedMeme(PUBLISHED_MEME)

      const response = await requestOembed({
        url: MEME_PAGE_URL_BY_LOCALE[locale],
        format: 'json'
      })
      const body: unknown = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
        'max-age=86400'
      )
      expect(body).toMatchObject({
        version: '1.0',
        type: 'video',
        title: EXPECTED_BY_LOCALE[locale].title,
        provider_name: 'Petit Meme',
        provider_url: 'https://www.petit-meme.io',
        width: 640,
        height: 360,
        thumbnail_url:
          'https://www.petit-meme.io/api/og?type=meme&id=meme-id&v=4',
        thumbnail_width: 1200,
        thumbnail_height: 630
      })
      expect(readPlayerHtml(body)).toContain(
        `<iframe src="${EXPECTED_BY_LOCALE[locale].embedUrl}" width="640" height="360"`
      )
    }
  )

  it('should fit the player inside the size the consumer allows', async () => {
    stubPublishedMeme(PUBLISHED_MEME)

    const response = await requestOembed({
      url: MEME_PAGE_URL_BY_LOCALE.fr,
      maxwidth: '480',
      maxheight: '180'
    })
    const body: unknown = await response.json()

    expect(body).toMatchObject({ width: 320, height: 180 })
    expect(readPlayerHtml(body)).toContain('width="320" height="180"')
  })

  it('should answer a Meme that is not Published with a 404 the CDN never keeps', async () => {
    stubPublishedMeme(null)

    const response = await requestOembed({ url: MEME_PAGE_URL_BY_LOCALE.en })

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store')
  })

  it('should refuse any format other than json with a 501', async () => {
    const response = await requestOembed({
      url: MEME_PAGE_URL_BY_LOCALE.fr,
      format: 'xml'
    })

    expect(response.status).toBe(HTTP_STATUS.NOT_IMPLEMENTED)
  })

  it('should answer a page that is not a Meme page with a 404, without reading the database', async () => {
    const findFirst = stubPublishedMeme(PUBLISHED_MEME)

    const responses = await Promise.all(
      NOT_A_MEME_PAGE_URLS.map((url) => {
        return requestOembed({ url })
      })
    )

    expect(
      responses.map((response) => {
        return response.status
      })
    ).toStrictEqual(
      NOT_A_MEME_PAGE_URLS.map(() => {
        return HTTP_STATUS.NOT_FOUND
      })
    )
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('should escape the Meme title inside the player markup', async () => {
    stubPublishedMeme(buildPublishedMeme('"><script>alert(1)</script>'))

    const response = await requestOembed({ url: MEME_PAGE_URL_BY_LOCALE.fr })
    const body: unknown = await response.json()

    expect(readPlayerHtml(body)).toContain(
      'title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'
    )
    expect(readPlayerHtml(body)).not.toContain('<script>')
  })
})
