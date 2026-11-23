import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db/client.server'
import { locales } from '~/paraglide/runtime'
import { readCachedCategoryMemeCounts } from '~/server/category/category.server'
import {
  buildLocalizedEntries,
  buildSitemapResponse,
  formatIsoDate,
  type SitemapPage,
  wrapUrlset
} from '~/server/seo/sitemap.server'

export const Route = createFileRoute('/sitemap-categories.xml')({
  server: {
    handlers: {
      GET: async () => {
        const [categories, countsByLocale] = await Promise.all([
          prismaClient.category.findMany({
            select: { id: true, slug: true, updatedAt: true }
          }),
          Promise.all(
            locales.map(async (locale) => {
              return {
                locale,
                counts: await readCachedCategoryMemeCounts(locale)
              }
            })
          )
        ])

        const pages: SitemapPage[] = [
          { pathname: '/memes/category/all' },
          ...categories.flatMap((category): SitemapPage[] => {
            const visibleLocales = countsByLocale
              .filter(({ counts }) => {
                return (counts.byCategory.get(category.id) ?? 0) > 0
              })
              .map(({ locale }) => {
                return locale
              })

            if (visibleLocales.length === 0) {
              return []
            }

            return [
              {
                pathname: `/memes/category/${category.slug}`,
                locales: visibleLocales,
                lastmod: formatIsoDate(category.updatedAt)
              }
            ]
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
