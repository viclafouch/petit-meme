import { buildUrl } from '@/lib/seo'
import { baseLocale, type Locale, locales } from '@/paraglide/runtime'

export type SitemapPage = {
  pathname: string
  lastmod?: string
  image?: SitemapImage
  video?: SitemapVideo
}

type SitemapImage = {
  loc: string
  title: string
}

type SitemapVideo = {
  thumbnailLoc: string
  title: string
  description: string
  contentLoc: string
  playerLoc?: string
  duration: number
  publicationDate?: string
}

type SitemapChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

type SitemapPriority =
  | '0.0'
  | '0.1'
  | '0.2'
  | '0.3'
  | '0.4'
  | '0.5'
  | '0.6'
  | '0.7'
  | '0.8'
  | '0.9'
  | '1.0'

type UrlEntryParams = {
  loc: string
  lastmod?: string
  changefreq?: SitemapChangeFreq
  priority?: SitemapPriority
  image?: SitemapImage
  video?: SitemapVideo
  hreflang?: {
    pathname: string
    locales: readonly Locale[]
  }
}

export const formatIsoDate = (date: Date) => {
  return date.toISOString().slice(0, 10)
}

const escapeXml = (text: string) => {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

const buildHreflangLinks = (
  pathname: string,
  targetLocales: readonly Locale[]
) => {
  return [
    ...targetLocales.map((locale) => {
      return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${buildUrl(pathname, locale)}" />`
    }),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl(pathname, baseLocale)}" />`
  ].join('\n')
}

const buildImageTag = ({ loc, title }: SitemapImage) => {
  return [
    '    <image:image>',
    `      <image:loc>${loc}</image:loc>`,
    `      <image:title>${escapeXml(title)}</image:title>`,
    '    </image:image>'
  ].join('\n')
}

const buildVideoTag = ({
  title,
  thumbnailLoc,
  description,
  contentLoc,
  playerLoc,
  duration,
  publicationDate
}: SitemapVideo) => {
  return [
    '    <video:video>',
    `      <video:title>${escapeXml(title)}</video:title>`,
    `      <video:thumbnail_loc>${thumbnailLoc}</video:thumbnail_loc>`,
    `      <video:description>${escapeXml(description)}</video:description>`,
    `      <video:content_loc>${contentLoc}</video:content_loc>`,
    ...(playerLoc
      ? [`      <video:player_loc>${playerLoc}</video:player_loc>`]
      : []),
    `      <video:duration>${duration}</video:duration>`,
    ...(publicationDate
      ? [
          `      <video:publication_date>${publicationDate}</video:publication_date>`
        ]
      : []),
    '      <video:family_friendly>yes</video:family_friendly>',
    '    </video:video>'
  ].join('\n')
}

export const buildUrlEntry = ({
  loc,
  lastmod,
  changefreq,
  priority,
  image,
  video,
  hreflang
}: UrlEntryParams) => {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    ...(video ? [buildVideoTag(video)] : []),
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...(changefreq ? [`    <changefreq>${changefreq}</changefreq>`] : []),
    ...(priority ? [`    <priority>${priority}</priority>`] : []),
    ...(hreflang
      ? [buildHreflangLinks(hreflang.pathname, hreflang.locales)]
      : []),
    ...(image ? [buildImageTag(image)] : []),
    '  </url>'
  ].join('\n')
}

export const buildLocalizedEntries = (pages: readonly SitemapPage[]) => {
  return pages
    .flatMap((page) => {
      const { pathname, ...content } = page

      return locales.map((locale) => {
        return buildUrlEntry({
          ...content,
          loc: buildUrl(pathname, locale),
          hreflang: { pathname, locales }
        })
      })
    })
    .join('\n')
}

const NS_SITEMAP = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
const NS_XHTML = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"'
const NS_IMAGE = 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
const NS_VIDEO = 'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'

const DEFAULT_NAMESPACES = [NS_SITEMAP, NS_XHTML, NS_IMAGE, NS_VIDEO].join(' ')

export const VIDEO_SITEMAP_NAMESPACES = [NS_SITEMAP, NS_VIDEO].join(' ')

export const wrapUrlset = (
  entries: string,
  namespaces = DEFAULT_NAMESPACES
) => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset ${namespaces}>`,
    entries,
    '</urlset>'
  ].join('\n')
}

type SitemapResponseParams = {
  body: string
  maxAge: number
}

export const buildSitemapResponse = ({
  body,
  maxAge
}: SitemapResponseParams) => {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`
    }
  })
}
