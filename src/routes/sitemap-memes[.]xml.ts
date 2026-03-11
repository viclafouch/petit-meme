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
import {
  buildSitemapResponse,
  buildUrlEntry,
  formatIsoDate,
  wrapUrlset
} from '@/lib/sitemap'
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
            publishedAt: true,
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
                lastmod: formatIsoDate(meme.updatedAt),
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
          .join('\n')

        return buildSitemapResponse({
          body: wrapUrlset(entries),
          maxAge: 3600
        })
      }
    }
  }
})
