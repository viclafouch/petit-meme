import { prismaClient } from '@/db'
import { websiteOrigin } from '@/lib/seo'
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
  { pathname: '/terms-of-use', changefreq: 'yearly', priority: '0.3' }
] as const satisfies readonly StaticPage[]

const formatDate = (date: Date) => {
  return date.toISOString().slice(0, 10)
}

type UrlEntry = {
  loc: string
  lastmod?: string
  changefreq: string
  priority: string
}

const buildUrlEntry = ({ loc, lastmod, changefreq, priority }: UrlEntry) => {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''

  return [
    '  <url>',
    `    <loc>${loc}</loc>${lastmodTag}`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
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

        const entries = [
          ...STATIC_PAGES.map((page) => {
            return buildUrlEntry({
              loc: `${websiteOrigin}${page.pathname}`,
              changefreq: page.changefreq,
              priority: page.priority
            })
          }),
          buildUrlEntry({
            loc: `${websiteOrigin}/memes/category/all`,
            changefreq: 'daily',
            priority: '0.9'
          }),
          ...categories.map((category) => {
            return buildUrlEntry({
              loc: `${websiteOrigin}/memes/category/${category.slug}`,
              lastmod: formatDate(category.updatedAt),
              changefreq: 'daily',
              priority: '0.8'
            })
          }),
          ...memes.map((meme) => {
            return buildUrlEntry({
              loc: `${websiteOrigin}/memes/${meme.id}`,
              lastmod: formatDate(meme.updatedAt),
              changefreq: 'weekly',
              priority: '0.6'
            })
          })
        ].join('\n')

        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          entries,
          '</urlset>'
        ].join('\n')

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml'
          }
        })
      }
    }
  }
})
