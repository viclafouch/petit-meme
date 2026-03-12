import { z } from 'zod'
import { MEME_TRANSLATION_SELECT, type MemeWithVideo } from '@/constants/meme'
import { prismaClient } from '@/db'
import { Prisma } from '@/db/generated/prisma/client'
import {
  resolveMemeTranslation,
  VISIBLE_CONTENT_LOCALES
} from '@/helpers/i18n-content'
import { getLocale } from '@/paraglide/runtime'
import { createServerFn } from '@tanstack/react-start'

export const getInfiniteReels = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z
      .object({
        excludedIds: z.array(z.string()).default([])
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const locale = getLocale()
    const visibleLocales = VISIBLE_CONTENT_LOCALES[locale]
    const MAX_EXCLUDED_IDS = 100
    const excludedIds = data.excludedIds.slice(-MAX_EXCLUDED_IDS)

    const excludeClause = excludedIds.length
      ? Prisma.sql`AND m."id" NOT IN (${Prisma.join(excludedIds)})`
      : Prisma.empty

    const rawMemes = await prismaClient.$queryRaw<{ meme: MemeWithVideo }[]>`
      SELECT json_build_object(
        'id', m."id",
        'title', m."title",
        'description', m."description",
        'contentLocale', m."content_locale",
        'viewCount', m."view_count",
        'video', json_build_object('id', v."id", 'bunnyId', v."bunny_id", 'duration', v."duration")
      ) AS meme
      FROM "meme" m
      JOIN "video" v ON m."video_id" = v."id"
      WHERE m."status" = 'PUBLISHED'
      AND m."content_locale" IN (${Prisma.join(visibleLocales)})
      ${excludeClause}
      ORDER BY RANDOM()
      LIMIT 20
    `.then((rows) => {
      return rows.map((row) => {
        return row.meme
      })
    })

    const memeIds = rawMemes.map((m) => {
      return m.id
    })

    const translations =
      memeIds.length > 0
        ? await prismaClient.memeTranslation.findMany({
            where: { memeId: { in: memeIds } },
            select: {
              memeId: true,
              ...MEME_TRANSLATION_SELECT
            }
          })
        : []

    const translationsByMemeId = Object.groupBy(translations, (translation) => {
      return translation.memeId
    })

    const memes = rawMemes.map((meme) => {
      const resolved = resolveMemeTranslation({
        translations: translationsByMemeId[meme.id] ?? [],
        contentLocale: meme.contentLocale,
        requestedLocale: locale,
        fallback: meme
      })

      return {
        ...meme,
        title: resolved.title,
        description: resolved.description
      }
    })

    const newExcludedIds = [
      ...excludedIds.slice(-Math.floor(excludedIds.length / 2)),
      ...memes.map((m) => {
        return m.id
      })
    ]

    return {
      memes,
      excludedIds: newExcludedIds
    }
  })
