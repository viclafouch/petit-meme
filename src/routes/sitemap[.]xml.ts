import { MEME_TRANSLATION_SELECT } from '@/constants/meme'
import { prismaClient } from '@/db'
import {
  CONTENT_LOCALE_TO_SITE_LOCALES,
  resolveMemeTranslation
} from '@/helpers/i18n-content'
import {
  buildIframeVideoUrl,
  buildVideoImageUrl,
  buildVideoOriginalUrl
} from '@/lib/bunny'
import { buildUrl } from '@/lib/seo'
import { baseLocale, type Locale, locales } from '@/paraglide/runtime'
import { createFileRoute } from '@tanstack/react-router'

type SitemapChangefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

type StaticPage = {
  pathname: string
  changefreq: SitemapChangefreq
  priority: string
}

const STATIC_PAGES = [
  { pathname: '/', changefreq: 'daily', priority: '1.0' },
  { pathname: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { pathname: '/reels', changefreq: 'daily', priority: '0.8' },
  { pathname: '/terms-of-use', changefreq: 'yearly', priority: '0.3' },
  { pathname: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { pathname: '/mentions-legales', changefreq: 'yearly', priority: '0.3' }
] as const satisfies readonly StaticPage[]

const formatDate = (date: Date) => {
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

type SitemapPage = StaticPage & {
  lastmod?: string
  image?: SitemapImage
  video?: SitemapVideo
}

type UrlEntryParams = SitemapPage & {
  loc: string
  hreflangLocales: readonly Locale[]
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

const buildUrlEntry = ({
  loc,
  pathname,
  lastmod,
  changefreq,
  priority,
  image,
  video,
  hreflangLocales
}: UrlEntryParams) => {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    buildHreflangLinks(pathname, hreflangLocales),
    ...(image ? [buildImageTag(image)] : []),
    ...(video ? [buildVideoTag(video)] : []),
    '  </url>'
  ].join('\n')
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const [memes, categories] = await Promise.all([
          prismaClient.meme.findMany({
            where: { status: 'PUBLISHED' },
            select: {
              id: true,
              title: true,
              description: true,
              contentLocale: true,
              translations: {
                select: MEME_TRANSLATION_SELECT
              },
              updatedAt: true,
              publishedAt: true,
              video: { select: { bunnyId: true, duration: true } }
            },
            orderBy: { publishedAt: 'desc' }
          }),
          prismaClient.category.findMany({
            select: { slug: true, updatedAt: true }
          })
        ])

        const genericPages: SitemapPage[] = [
          ...STATIC_PAGES,
          {
            pathname: '/memes/category/all',
            changefreq: 'daily',
            priority: '0.9'
          },
          ...categories.map((category): SitemapPage => {
            return {
              pathname: `/memes/category/${category.slug}`,
              lastmod: formatDate(category.updatedAt),
              changefreq: 'daily',
              priority: '0.8'
            }
          })
        ]

        const genericEntries = genericPages.flatMap((page) => {
          return locales.map((locale) => {
            return buildUrlEntry({
              ...page,
              loc: buildUrl(page.pathname, locale),
              hreflangLocales: locales
            })
          })
        })

        const memeEntries = memes.flatMap((meme) => {
          const targetLocales =
            CONTENT_LOCALE_TO_SITE_LOCALES[meme.contentLocale]
          const { bunnyId } = meme.video
          const thumbnailUrl = buildVideoImageUrl(bunnyId)

          return targetLocales.map((locale) => {
            const resolved = resolveMemeTranslation({
              translations: meme.translations,
              contentLocale: meme.contentLocale,
              requestedLocale: locale,
              fallback: meme
            })

            return buildUrlEntry({
              pathname: `/memes/${meme.id}`,
              loc: buildUrl(`/memes/${meme.id}`, locale),
              lastmod: formatDate(meme.updatedAt),
              changefreq: 'weekly',
              priority: '0.6',
              hreflangLocales: targetLocales,
              image: {
                loc: thumbnailUrl,
                title: resolved.title
              },
              video: {
                thumbnailLoc: thumbnailUrl,
                title: resolved.title,
                description: resolved.description || resolved.title,
                contentLoc: buildVideoOriginalUrl(bunnyId),
                playerLoc: buildIframeVideoUrl(bunnyId),
                duration: meme.video.duration,
                publicationDate: meme.publishedAt
                  ? meme.publishedAt.toISOString()
                  : meme.updatedAt.toISOString()
              }
            })
          })
        })

        const entries = [...genericEntries, ...memeEntries].join('\n')

        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
          entries,
          '</urlset>'
        ].join('\n')

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
          }
        })
      }
    }
  }
})
