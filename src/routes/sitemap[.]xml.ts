import { prismaClient } from '@/db'
import { buildUrl } from '@/lib/seo'
import { baseLocale, locales } from '@/paraglide/runtime'
import { createFileRoute } from '@tanstack/react-router'

type StaticPage = {
  pathname: string
  changefreq: string
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

const buildHreflangLinks = (pathname: string) => {
  return [
    ...locales.map((locale) => {
      return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${buildUrl(pathname, locale)}" />`
    }),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl(pathname, baseLocale)}" />`
  ].join('\n')
}

type SitemapPage = StaticPage & {
  lastmod?: string
}

type UrlEntryParams = SitemapPage & {
  loc: string
}

const buildUrlEntry = ({
  loc,
  pathname,
  lastmod,
  changefreq,
  priority
}: UrlEntryParams) => {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''

  return [
    '  <url>',
    `    <loc>${loc}</loc>${lastmodTag}`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    buildHreflangLinks(pathname),
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
            select: { id: true, updatedAt: true },
            orderBy: { publishedAt: 'desc' }
          }),
          prismaClient.category.findMany({
            select: { slug: true, updatedAt: true }
          })
        ])

        const allPages: SitemapPage[] = [
          ...STATIC_PAGES,
          {
            pathname: '/memes/category/all',
            changefreq: 'daily',
            priority: '0.9'
          },
          ...categories.map((category) => {
            return {
              pathname: `/memes/category/${category.slug}`,
              lastmod: formatDate(category.updatedAt),
              changefreq: 'daily',
              priority: '0.8'
            }
          }),
          ...memes.map((meme) => {
            return {
              pathname: `/memes/${meme.id}`,
              lastmod: formatDate(meme.updatedAt),
              changefreq: 'weekly',
              priority: '0.6'
            }
          })
        ]

        const entries = allPages
          .flatMap((page) => {
            return locales.map((locale) => {
              return buildUrlEntry({
                ...page,
                loc: buildUrl(page.pathname, locale)
              })
            })
          })
          .join('\n')

        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
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
