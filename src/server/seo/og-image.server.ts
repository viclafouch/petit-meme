import type React from 'react'
import type { ImageResponseOptions } from 'takumi-js/response'
import bricolageGrotesqueBold from '~/components/og/assets/bricolage-grotesque-bold.ttf?inline'
import { OgHomeTemplate } from '~/components/og/og-home-template'
import { OgMemeTemplate } from '~/components/og/og-meme-template'
import { OgTemplate } from '~/components/og/og-template'
import {
  CDN_CACHE_CONTROL_HEADER,
  DAILY_CDN_CACHE_CONTROL,
  HTTP_STATUS,
  UNCACHED_CDN_HEADERS,
  YEARLY_CDN_CACHE_CONTROL
} from '~/constants/http'
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OG_MEME_THUMBNAIL_SOURCE
} from '~/constants/og'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { captureWithFeature } from '~/lib/sentry'
import { websiteOrigin } from '~/lib/seo/url'
import type { Locale } from '~/paraglide/runtime'
import { findPublishedMeme } from '~/server/meme/published-meme.server'

type OgImageOutput = { format: 'png' } | { format: 'jpeg'; quality: number }

type RenderOgImageParams = {
  template: React.ReactElement
  output: OgImageOutput
  cdnCacheControl: string
  images?: ImageResponseOptions['images']
}

const toBytes = (dataUrl: string) => {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
}

const OG_FONTS = [
  {
    name: 'Bricolage Grotesque',
    weight: 700,
    data: toBytes(bricolageGrotesqueBold)
  }
]

const OG_HOSTNAME = new URL(websiteOrigin).hostname

const THUMBNAIL_FETCH_TIMEOUT_MS = 5000

const PAGE_IMAGE_OUTPUT = { format: 'png' } as const satisfies OgImageOutput

const MEME_IMAGE_OUTPUT = {
  format: 'jpeg',
  quality: 80
} as const satisfies OgImageOutput

const renderOgImage = async ({
  template,
  output,
  cdnCacheControl,
  images
}: RenderOgImageParams) => {
  const { default: ImageResponse } = await import('takumi-js/response')

  const response = new ImageResponse(template, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    ...output,
    fonts: OG_FONTS,
    images,
    headers: { [CDN_CACHE_CONTROL_HEADER]: cdnCacheControl },
    onError: (error) => {
      captureWithFeature(error, 'og-image')
    }
  })

  try {
    await response.ready

    return response
  } catch {
    return new Response('Failed to render the OG image', {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: UNCACHED_CDN_HEADERS
    })
  }
}

export const renderHomeOgImage = (locale: Locale) => {
  return renderOgImage({
    template: OgHomeTemplate({ locale, hostname: OG_HOSTNAME }),
    output: PAGE_IMAGE_OUTPUT,
    cdnCacheControl: YEARLY_CDN_CACHE_CONTROL
  })
}

type RenderPageOgImageParams = {
  title: string
  subtitle?: string
}

export const renderPageOgImage = ({
  title,
  subtitle
}: RenderPageOgImageParams) => {
  return renderOgImage({
    template: OgTemplate({ title, subtitle, hostname: OG_HOSTNAME }),
    output: PAGE_IMAGE_OUTPUT,
    cdnCacheControl: YEARLY_CDN_CACHE_CONTROL
  })
}

export const renderMemeOgImage = (thumbnail: Uint8Array) => {
  return renderOgImage({
    template: OgMemeTemplate(),
    output: MEME_IMAGE_OUTPUT,
    cdnCacheControl: DAILY_CDN_CACHE_CONTROL,
    images: [{ src: OG_MEME_THUMBNAIL_SOURCE, data: thumbnail, cache: 'none' }]
  })
}

const fetchThumbnail = async (bunnyId: string) => {
  try {
    const response = await fetch(buildVideoImageUrl(bunnyId), {
      signal: AbortSignal.timeout(THUMBNAIL_FETCH_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(`Thumbnail fetch failed with status ${response.status}`)
    }

    return new Uint8Array(await response.arrayBuffer())
  } catch (error) {
    captureWithFeature(error, 'og-image')

    return null
  }
}

export const renderPublishedMemeOgImage = async (memeId: string) => {
  const meme = await findPublishedMeme(memeId)

  if (meme === null) {
    return new Response('Meme not found', {
      status: HTTP_STATUS.NOT_FOUND,
      headers: UNCACHED_CDN_HEADERS
    })
  }

  const thumbnail = await fetchThumbnail(meme.video.bunnyId)

  if (thumbnail === null) {
    return new Response('Failed to load the Meme thumbnail', {
      status: HTTP_STATUS.BAD_GATEWAY,
      headers: UNCACHED_CDN_HEADERS
    })
  }

  return renderMemeOgImage(thumbnail)
}
