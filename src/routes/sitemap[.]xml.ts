import { websiteOrigin } from '@/lib/seo'
import { buildSitemapResponse } from '@/lib/sitemap'
import { createFileRoute } from '@tanstack/react-router'

const SUB_SITEMAPS = [
  'sitemap-static.xml',
  'sitemap-categories.xml',
  'sitemap-memes.xml'
] as const satisfies readonly string[]

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const entries = SUB_SITEMAPS.map((filename) => {
          return [
            '  <sitemap>',
            `    <loc>${websiteOrigin}/${filename}</loc>`,
            '  </sitemap>'
          ].join('\n')
        }).join('\n')

        const sitemapIndex = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          entries,
          '</sitemapindex>'
        ].join('\n')

        return buildSitemapResponse({ body: sitemapIndex, maxAge: 86_400 })
      }
    }
  }
})
