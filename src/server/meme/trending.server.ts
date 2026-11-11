import { createServerOnlyFn } from '@tanstack/react-start'
import {
  MEME_TRANSLATION_SELECT,
  MEME_VIDEO_INCLUDE,
  MEMES_PER_PAGE,
  TRENDING_CATEGORY_CACHE_TTL,
  TRENDING_CATEGORY_DAYS,
  TRENDING_CATEGORY_LIMIT,
  TRENDING_MEMES_COUNT,
  TRENDING_WEIGHTS
} from '~/constants/meme'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus, type MemeContentLocale } from '~/db/generated/prisma/enums'
import { localizeMemes } from '~/helpers/i18n-content'
import type { Locale } from '~/paraglide/runtime'
import {
  readCachedMemeIds,
  writeRecommendCache
} from '~/server/meme/recommend-cache.server'

type TrendingMemeRow = {
  memeId: string
}

type FindMostViewedMemesParams = {
  locale: Locale
  visibleLocales: MemeContentLocale[]
}

const MEME_WITH_VIDEO_AND_TRANSLATIONS_INCLUDE = {
  ...MEME_VIDEO_INCLUDE,
  translations: { select: MEME_TRANSLATION_SELECT }
} as const satisfies Prisma.MemeInclude

export const buildTrendingSignalsSql = (since: Date) => {
  return Prisma.sql`
    LEFT JOIN (
      SELECT "meme_id", COUNT(*)::bigint AS views
      FROM "meme_view_daily"
      WHERE day >= ${since}
      GROUP BY "meme_id"
    ) v ON v."meme_id" = m.id
    LEFT JOIN (
      SELECT "meme_id", COUNT(*)::bigint AS bookmarks
      FROM "user_bookmark"
      WHERE "created_at" >= ${since}
      GROUP BY "meme_id"
    ) b ON b."meme_id" = m.id
    LEFT JOIN (
      SELECT
        "meme_id",
        SUM(CASE WHEN action = 'download' THEN count ELSE 0 END)::bigint AS downloads,
        SUM(CASE WHEN action = 'share' THEN count ELSE 0 END)::bigint AS shares
      FROM "meme_action_daily"
      WHERE day >= ${since} AND action IN ('download', 'share')
      GROUP BY "meme_id"
    ) ds ON ds."meme_id" = m.id
    LEFT JOIN (
      SELECT "meme_id", COUNT(*)::bigint AS generations
      FROM "studio_generation"
      WHERE "created_at" >= ${since} AND "meme_id" IS NOT NULL
      GROUP BY "meme_id"
    ) g ON g."meme_id" = m.id
  `
}

export const TRENDING_ACTIVITY_SQL = Prisma.sql`(
  COALESCE(v.views, 0)
  + COALESCE(b.bookmarks, 0)
  + COALESCE(ds.downloads, 0)
  + COALESCE(g.generations, 0)
  + COALESCE(ds.shares, 0)
)`

export const TRENDING_SCORE_SQL = Prisma.sql`(
  COALESCE(v.views, 0) * ${TRENDING_WEIGHTS.views}
  + COALESCE(b.bookmarks, 0) * ${TRENDING_WEIGHTS.bookmarks}
  + COALESCE(ds.downloads, 0) * ${TRENDING_WEIGHTS.downloads}
  + COALESCE(g.generations, 0) * ${TRENDING_WEIGHTS.generations}
  + COALESCE(ds.shares, 0) * ${TRENDING_WEIGHTS.shares}
)`

const findTrendingMemeIds = async (visibleLocales: MemeContentLocale[]) => {
  const since = new Date(Date.now() - TRENDING_CATEGORY_DAYS * DAY)

  const rows = await prismaClient.$queryRaw<TrendingMemeRow[]>`
    SELECT m.id AS "memeId"
    FROM "meme" m
    ${buildTrendingSignalsSql(since)}
    WHERE m.status = ${MemeStatus.PUBLISHED}
    AND m."content_locale" IN (${Prisma.join(visibleLocales)})
    AND ${TRENDING_ACTIVITY_SQL} > 0
    ORDER BY ${TRENDING_SCORE_SQL} DESC
    LIMIT ${TRENDING_CATEGORY_LIMIT}
  `

  return rows.map((row) => {
    return row.memeId
  })
}

const readTrendingMemeIds = async (visibleLocales: MemeContentLocale[]) => {
  const cacheKey = `trending-category:${visibleLocales.join(',')}`
  const cachedIds = await readCachedMemeIds(cacheKey)

  if (cachedIds) {
    return cachedIds
  }

  const memeIds = await findTrendingMemeIds(visibleLocales)

  if (memeIds.length > 0) {
    void writeRecommendCache({
      key: cacheKey,
      data: memeIds,
      ttl: TRENDING_CATEGORY_CACHE_TTL
    })
  }

  return memeIds
}

export const findTrendingFirstPageIds = createServerOnlyFn(
  async (visibleLocales: MemeContentLocale[]) => {
    const trendingIds = await readTrendingMemeIds(visibleLocales)

    if (trendingIds.length >= MEMES_PER_PAGE) {
      return trendingIds.slice(0, MEMES_PER_PAGE)
    }

    const complementMemes = await prismaClient.meme.findMany({
      take: MEMES_PER_PAGE - trendingIds.length,
      select: { id: true },
      orderBy: { viewCount: 'desc' },
      where: {
        status: MemeStatus.PUBLISHED,
        contentLocale: { in: visibleLocales },
        id: { notIn: trendingIds }
      }
    })

    return [
      ...trendingIds,
      ...complementMemes.map((meme) => {
        return meme.id
      })
    ]
  }
)

export const findMemesInOrder = createServerOnlyFn(
  async (memeIds: string[], locale: Locale) => {
    const memes = await prismaClient.meme.findMany({
      where: { id: { in: memeIds } },
      include: MEME_WITH_VIDEO_AND_TRANSLATIONS_INCLUDE
    })

    const memeById = new Map(
      memes.map((meme) => {
        return [meme.id, meme]
      })
    )

    const orderedMemes = memeIds
      .map((memeId) => {
        return memeById.get(memeId)
      })
      .filter((meme) => {
        return meme !== undefined
      })

    return localizeMemes(orderedMemes, locale)
  }
)

export const findMostViewedMemes = createServerOnlyFn(
  async ({ locale, visibleLocales }: FindMostViewedMemesParams) => {
    const memes = await prismaClient.meme.findMany({
      take: TRENDING_MEMES_COUNT,
      include: MEME_WITH_VIDEO_AND_TRANSLATIONS_INCLUDE,
      orderBy: { viewCount: 'desc' },
      where: {
        status: MemeStatus.PUBLISHED,
        contentLocale: { in: visibleLocales }
      }
    })

    return localizeMemes(memes, locale)
  }
)
