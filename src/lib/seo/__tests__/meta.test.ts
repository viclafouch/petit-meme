import { afterEach, describe, expect, it } from 'vitest'
import type { MemeWithCategories, MemeWithVideo } from '~/constants/meme'
import { buildMemeSeo, buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { getLocale, type Locale, overwriteGetLocale } from '~/paraglide/runtime'

const initialGetLocale = getLocale

const PUBLISHED_MEME = {
  id: 'meme-id',
  title: 'Meme title',
  videoId: 1,
  viewCount: 10,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  description: 'Meme description',
  keywords: ['keyword'],
  contentLocale: 'FR',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  publishedAt: new Date('2026-01-02T00:00:00Z'),
  status: 'PUBLISHED',
  video: {
    id: 1,
    bunnyId: 'video-guid',
    duration: 12,
    width: null,
    height: null,
    bunnyStatus: 3
  },
  categories: []
} as const satisfies MemeWithVideo & MemeWithCategories

const MEME_IMAGE_URL =
  'https://www.petit-meme.io/api/og?type=meme&id=meme-id&v=5'

const MEME_IMAGE_ALT_BY_LOCALE = {
  fr: 'Mème vidéo : Meme title',
  en: 'Video meme: Meme title'
} as const satisfies Record<Locale, string>

const PRICING_IMAGE_URL =
  'https://www.petit-meme.io/api/og?type=pricing&locale=en&v=5'

const PENDING_MEME = {
  ...PUBLISHED_MEME,
  status: 'PENDING',
  publishedAt: null
} as const satisfies MemeWithVideo & MemeWithCategories

const OEMBED_LINK_BY_LOCALE = {
  fr: 'https://www.petit-meme.io/api/oembed?url=https%3A%2F%2Fwww.petit-meme.io%2Fmemes%2Fmeme-id&format=json',
  en: 'https://www.petit-meme.io/api/oembed?url=https%3A%2F%2Fwww.petit-meme.io%2Fen%2Fmemes%2Fmeme-id&format=json'
} as const satisfies Record<Locale, string>

const findOembedLink = (links: ReturnType<typeof buildMemeSeo>['links']) => {
  return links.find((link) => {
    return link?.type === 'application/json+oembed'
  })
}

const useLocale = (locale: Locale) => {
  overwriteGetLocale(() => {
    return locale
  })
}

const readMeta = (
  meta: ReturnType<typeof buildMemeSeo>['meta'],
  key: string
) => {
  return meta.find((tag) => {
    return (
      (tag && 'property' in tag && tag.property === key) ||
      (tag && 'name' in tag && tag.name === key)
    )
  })?.content
}

const readImageTags = (meta: ReturnType<typeof buildMemeSeo>['meta']) => {
  return {
    url: readMeta(meta, 'og:image'),
    type: readMeta(meta, 'og:image:type'),
    width: readMeta(meta, 'og:image:width'),
    height: readMeta(meta, 'og:image:height'),
    alt: readMeta(meta, 'og:image:alt'),
    twitterCard: readMeta(meta, 'twitter:card'),
    twitterUrl: readMeta(meta, 'twitter:image'),
    twitterAlt: readMeta(meta, 'twitter:image:alt')
  }
}

const listVideoTags = (meta: ReturnType<typeof buildMemeSeo>['meta']) => {
  return meta.filter((tag) => {
    return tag && 'property' in tag && tag.property?.startsWith('og:video')
  })
}

describe('the Meme page tags', () => {
  afterEach(() => {
    overwriteGetLocale(initialGetLocale)
  })

  it.each(['fr', 'en'] as const)(
    'should share a Published Meme with its play-button image, in %s',
    (locale) => {
      useLocale(locale)

      const { meta } = buildMemeSeo(PUBLISHED_MEME)

      expect(readImageTags(meta)).toStrictEqual({
        url: MEME_IMAGE_URL,
        type: 'image/jpeg',
        width: '1200',
        height: '630',
        alt: MEME_IMAGE_ALT_BY_LOCALE[locale],
        twitterCard: 'summary_large_image',
        twitterUrl: MEME_IMAGE_URL,
        twitterAlt: MEME_IMAGE_ALT_BY_LOCALE[locale]
      })
    }
  )

  it.each(['fr', 'en'] as const)(
    'should link the oEmbed endpoint of the Meme page, in %s',
    (locale) => {
      useLocale(locale)

      const { links } = buildMemeSeo(PUBLISHED_MEME, {
        pathname: '/memes/meme-id'
      })

      expect(findOembedLink(links)).toStrictEqual({
        rel: 'alternate',
        type: 'application/json+oembed',
        href: OEMBED_LINK_BY_LOCALE[locale],
        title: 'Meme title'
      })
    }
  )

  it('should keep every video URL out of the tags', () => {
    const { meta } = buildMemeSeo(PUBLISHED_MEME)

    expect(listVideoTags(meta)).toStrictEqual([])
    expect(JSON.stringify(meta)).not.toContain('video-guid')
  })

  it('should share no image and no player for a Meme that is not Published', () => {
    const { meta, links } = buildMemeSeo(PENDING_MEME, {
      pathname: '/memes/meme-id'
    })

    expect(readMeta(meta, 'og:image')).toBeUndefined()
    expect(findOembedLink(links)).toBeUndefined()
  })
})

describe('the public page tags', () => {
  it('should declare a 1200×630 PNG with its alt for a page image', () => {
    const { meta } = buildSeo({
      title: 'Pricing',
      image: buildOgImage({ type: 'pricing', locale: 'en' }, 'Pricing')
    })

    expect(readImageTags(meta)).toStrictEqual({
      url: PRICING_IMAGE_URL,
      type: 'image/png',
      width: '1200',
      height: '630',
      alt: 'Pricing',
      twitterCard: 'summary_large_image',
      twitterUrl: PRICING_IMAGE_URL,
      twitterAlt: 'Pricing'
    })
  })

  it('should title the share card without the site name, which travels in og:site_name', () => {
    const { meta } = buildSeo({ title: 'Pricing' })

    expect(readMeta(meta, 'og:title')).toBe('Pricing')
    expect(readMeta(meta, 'twitter:title')).toBe('Pricing')
    expect(readMeta(meta, 'og:site_name')).toBe('Petit Meme')
  })
})
