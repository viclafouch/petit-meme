import { MEME_TRANSLATION_SELECT } from '~/constants/meme'
import { prismaClient } from '~/db'
import {
  CONTENT_LOCALE_TO_SITE_LOCALES,
  resolveMemeTranslation
} from '~/helpers/i18n-content'
import { buildVideoImageUrl, buildVideoOriginalUrl } from '~/lib/bunny'
import { buildUrl } from '~/lib/seo'
import {
  buildSitemapResponse,
  buildUrlEntry,
  VIDEO_SITEMAP_NAMESPACES,
  wrapUrlset
} from '~/lib/sitemap'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sitemap-memes.xml')({
  server: {
    handlers: {
      GET: async () => {
        const memes = await prismaClient.meme.findMany({
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
            video: { select: { bunnyId: true, duration: true } }
          },
          orderBy: { publishedAt: 'desc' }
        })

        const entries = memes
          .flatMap((meme) => {
            const targetLocales =
              CONTENT_LOCALE_TO_SITE_LOCALES[meme.contentLocale]
            const { bunnyId } = meme.video
            const thumbnailUrl = buildVideoImageUrl(bunnyId)
            const contentLoc = buildVideoOriginalUrl(bunnyId)
            const memePath = `/memes/${meme.id}`
            const lastmod = meme.updatedAt.toISOString()

            return targetLocales.map((locale) => {
              const resolved = resolveMemeTranslation({
                translations: meme.translations,
                contentLocale: meme.contentLocale,
                requestedLocale: locale,
                fallback: meme
              })

              return buildUrlEntry({
                loc: buildUrl(memePath, locale),
                lastmod,
                changefreq: 'monthly',
                priority: '0.7',
                video: {
                  thumbnailLoc: thumbnailUrl,
                  title: resolved.title,
                  description: resolved.description || resolved.title,
                  contentLoc,
                  duration: meme.video.duration
                }
              })
            })
          })
          .join('\n')

        return buildSitemapResponse({
          body: wrapUrlset(entries, VIDEO_SITEMAP_NAMESPACES),
          maxAge: 3600
        })
      }
    }
  }
})
