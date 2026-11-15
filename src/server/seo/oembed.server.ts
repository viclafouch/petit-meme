import { z } from 'zod'
import { SITE_NAME } from '~/constants/branding'
import {
  CDN_CACHE_CONTROL_HEADER,
  DAILY_CDN_CACHE_CONTROL,
  HTTP_STATUS,
  UNCACHED_CDN_HEADERS
} from '~/constants/http'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { ONE_DAY_IN_SECONDS } from '~/constants/time'
import { localizeMeme } from '~/helpers/i18n-content'
import { escapeMarkup } from '~/helpers/markup'
import { withDefaultMemeTitle } from '~/helpers/meme'
import {
  buildEmbedUrl,
  buildMemeOgImageUrl,
  websiteOrigin
} from '~/lib/seo/url'
import {
  baseLocale,
  deLocalizeUrl,
  extractLocaleFromUrl,
  type Locale
} from '~/paraglide/runtime'
import { findPublishedMeme } from '~/server/meme/published-meme.server'

const PLAYER_WIDTH = 640
const PLAYER_HEIGHT = 360

const MEME_PAGE_PATHNAME = /^\/memes\/(?<memeId>[^/]+)\/?$/u

const OEMBED_QUERY_SCHEMA = z.object({
  url: z.string().min(1),
  format: z.string().default('json'),
  maxwidth: z.coerce.number().int().positive().optional(),
  maxheight: z.coerce.number().int().positive().optional()
})

const toMemePage = (value: string) => {
  const url = URL.parse(value)

  if (url === null || url.origin !== websiteOrigin) {
    return null
  }

  const memeId = MEME_PAGE_PATHNAME.exec(deLocalizeUrl(url).pathname)?.groups
    ?.memeId

  if (memeId === undefined) {
    return null
  }

  return { memeId, locale: extractLocaleFromUrl(url) ?? baseLocale }
}

const findPublishedMemeTitle = async (memeId: string, locale: Locale) => {
  const meme = await findPublishedMeme(memeId)

  return meme ? withDefaultMemeTitle(localizeMeme(meme, locale)).title : null
}

type PlayerSizeParams = {
  maxwidth?: number
  maxheight?: number
}

const buildPlayerSize = ({ maxwidth, maxheight }: PlayerSizeParams) => {
  const width = Math.min(
    PLAYER_WIDTH,
    maxwidth ?? PLAYER_WIDTH,
    Math.floor(((maxheight ?? PLAYER_HEIGHT) * PLAYER_WIDTH) / PLAYER_HEIGHT)
  )

  return {
    width,
    height: Math.round((width * PLAYER_HEIGHT) / PLAYER_WIDTH)
  }
}

type BuildPlayerHtmlParams = {
  embedUrl: string
  title: string
  width: number
  height: number
}

const buildPlayerHtml = ({
  embedUrl,
  title,
  width,
  height
}: BuildPlayerHtmlParams) => {
  return `<iframe src="${escapeMarkup(embedUrl)}" width="${width}" height="${height}" title="${escapeMarkup(title)}" allow="fullscreen; picture-in-picture" loading="lazy" style="border:0"></iframe>`
}

const respondWithError = (status: number, message: string) => {
  return new Response(message, { status, headers: UNCACHED_CDN_HEADERS })
}

export const respondToOembedRequest = async (requestUrl: URL) => {
  const query = OEMBED_QUERY_SCHEMA.safeParse(
    Object.fromEntries(requestUrl.searchParams)
  )

  if (!query.success) {
    return respondWithError(HTTP_STATUS.BAD_REQUEST, 'Invalid parameters')
  }

  if (query.data.format !== 'json') {
    return respondWithError(
      HTTP_STATUS.NOT_IMPLEMENTED,
      'Only the json format is supported'
    )
  }

  const page = toMemePage(query.data.url)
  const title = page
    ? await findPublishedMemeTitle(page.memeId, page.locale)
    : null

  if (page === null || title === null) {
    return respondWithError(HTTP_STATUS.NOT_FOUND, 'Meme not found')
  }

  const { width, height } = buildPlayerSize(query.data)

  return Response.json(
    {
      version: '1.0',
      type: 'video',
      title,
      provider_name: SITE_NAME,
      provider_url: websiteOrigin,
      cache_age: ONE_DAY_IN_SECONDS,
      thumbnail_url: buildMemeOgImageUrl(page.memeId),
      thumbnail_width: OG_IMAGE_WIDTH,
      thumbnail_height: OG_IMAGE_HEIGHT,
      html: buildPlayerHtml({
        embedUrl: buildEmbedUrl(page.memeId, page.locale),
        title,
        width,
        height
      }),
      width,
      height
    },
    { headers: { [CDN_CACHE_CONTROL_HEADER]: DAILY_CDN_CACHE_CONTROL } }
  )
}
