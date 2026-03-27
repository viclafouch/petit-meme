import { prismaClient } from '~/db'
import {
  buildLocalizedEntries,
  buildSitemapResponse,
  formatIsoDate,
  type SitemapPage,
  wrapUrlset
} from '~/lib/sitemap'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sitemap-categories.xml')({
  server: {
    handlers: {
      GET: async () => {
        const categories = await prismaClient.category.findMany({
          select: { slug: true, updatedAt: true }
        })

        const pages: SitemapPage[] = [
          { pathname: '/memes/category/all' },
          ...categories.map((category): SitemapPage => {
            return {
              pathname: `/memes/category/${category.slug}`,
              lastmod: formatIsoDate(category.updatedAt)
            }
          })
        ]

        return buildSitemapResponse({
          body: wrapUrlset(buildLocalizedEntries(pages)),
          maxAge: 3600
        })
      }
    }
  }
})
