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
  playerLoc: string
  duration: number
  publicationDate: string
}

type UrlEntryParams = SitemapPage & {
  loc: string
  hreflangLocales: readonly Locale[]
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
  thumbnailLoc,
  title,
  description,
  contentLoc,
  playerLoc,
  duration,
  publicationDate
}: SitemapVideo) => {
  return [
    '    <video:video>',
    `      <video:thumbnail_loc>${thumbnailLoc}</video:thumbnail_loc>`,
    `      <video:title>${escapeXml(title)}</video:title>`,
    `      <video:description>${escapeXml(description)}</video:description>`,
    `      <video:content_loc>${contentLoc}</video:content_loc>`,
    `      <video:player_loc>${playerLoc}</video:player_loc>`,
    `      <video:duration>${duration}</video:duration>`,
    `      <video:publication_date>${publicationDate}</video:publication_date>`,
    '      <video:family_friendly>yes</video:family_friendly>',
    '    </video:video>'
  ].join('\n')
}

export const buildUrlEntry = ({
  loc,
  pathname,
  lastmod,
  image,
  video,
  hreflangLocales
}: UrlEntryParams) => {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    buildHreflangLinks(pathname, hreflangLocales),
    ...(image ? [buildImageTag(image)] : []),
    ...(video ? [buildVideoTag(video)] : []),
    '  </url>'
  ].join('\n')
}

export const buildLocalizedEntries = (pages: readonly SitemapPage[]) => {
  return pages
    .flatMap((page) => {
      return locales.map((locale) => {
        return buildUrlEntry({
          ...page,
          loc: buildUrl(page.pathname, locale),
          hreflangLocales: locales
        })
      })
    })
    .join('\n')
}

const URLSET_NAMESPACES = [
  'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  'xmlns:xhtml="http://www.w3.org/1999/xhtml"',
  'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
  'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'
].join(' ')

export const wrapUrlset = (entries: string) => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset ${URLSET_NAMESPACES}>`,
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
