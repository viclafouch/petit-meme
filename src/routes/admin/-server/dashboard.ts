import { z } from 'zod'
import { DAY } from '@/constants/time'
import { prismaClient } from '@/db'
import type { Prisma } from '@/db/generated/prisma/client'
import { MemeStatus } from '@/db/generated/prisma/enums'
import {
  type ChartGranularity,
  generateDateSeries,
  getChartGranularity,
  truncateToGranularity,
  truncateToUtcDay
} from '@/helpers/date'
import type {
  AuditAction,
  AuditMetadata,
  AuditTargetType
} from '@/server/audit'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'

const TRENDING_WEIGHTS = {
  views: 1,
  bookmarks: 2,
  downloads: 3,
  generations: 4,
  shares: 5
} as const satisfies Record<string, number>

const TRENDING_DAYS = 7

export const PERIOD_SCHEMA = z.enum(['7d', '30d', '90d', 'all'])

export type DashboardPeriod = z.infer<typeof PERIOD_SCHEMA>

const PERIOD_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null
} as const satisfies Record<DashboardPeriod, number | null>

export type DashboardTotals = {
  publishedMemes: number
  pendingMemes: number
  totalUsers: number
  activePremium: number
}

async function fetchTotals() {
  const [publishedMemes, pendingMemes, totalUsers, activePremium] =
    await Promise.all([
      prismaClient.meme.count({ where: { status: MemeStatus.PUBLISHED } }),
      prismaClient.meme.count({ where: { status: MemeStatus.PENDING } }),
      prismaClient.user.count(),
      prismaClient.subscription.count({ where: { status: 'active' } })
    ])

  return { publishedMemes, pendingMemes, totalUsers, activePremium }
}

export const getAdminDashboardTotals = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return fetchTotals()
  })

const PLATFORM_LAUNCH_DATE = new Date('2025-01-01T00:00:00.000Z')

export type ChartDataPoint = {
  date: string
  views: number
  studioGenerations: number
  shares: number
  downloads: number
  signups: number
}

function aggregateRowsByGranularity(
  rows: { day: Date; count: number }[],
  granularity: ChartGranularity
) {
  const map = new Map<string, number>()

  for (const row of rows) {
    const key = truncateToGranularity(row.day, granularity)
    map.set(key, (map.get(key) ?? 0) + row.count)
  }

  return map
}

function aggregateActionsByGranularity(
  rows: { day: Date; action: string; _sum: { count: number | null } }[],
  granularity: ChartGranularity
) {
  const shares = new Map<string, number>()
  const downloads = new Map<string, number>()

  for (const row of rows) {
    const key = truncateToGranularity(row.day, granularity)
    const target = row.action === 'share' ? shares : downloads
    target.set(key, (target.get(key) ?? 0) + (row._sum.count ?? 0))
  }

  return { shares, downloads }
}

type DailyCountRow = { day: Date; count: bigint }

type FetchChartDataParams = {
  start: Date
  end: Date
  granularity: ChartGranularity
}

async function fetchChartData({
  start,
  end,
  granularity
}: FetchChartDataParams) {
  const dateRange = { gte: start, lte: end }

  const [viewRows, generationRows, actionRows, signupRows] = await Promise.all([
    prismaClient.memeViewDaily.groupBy({
      by: ['day'],
      where: { day: dateRange },
      _count: { id: true }
    }),
    prismaClient.$queryRaw<DailyCountRow[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*) AS count
        FROM "studio_generation"
        WHERE "created_at" >= ${start} AND "created_at" <= ${end}
        GROUP BY 1
      `,
    prismaClient.memeActionDaily.groupBy({
      by: ['day', 'action'],
      where: { day: dateRange },
      _sum: { count: true }
    }),
    prismaClient.$queryRaw<DailyCountRow[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*) AS count
        FROM "user"
        WHERE "created_at" >= ${start} AND "created_at" <= ${end}
        GROUP BY 1
      `
  ])

  const viewsMap = aggregateRowsByGranularity(
    viewRows.map((row) => {
      return { day: row.day, count: row._count.id }
    }),
    granularity
  )
  const generationsMap = aggregateRowsByGranularity(
    generationRows.map((row) => {
      return { day: row.day, count: Number(row.count) }
    }),
    granularity
  )
  const { shares: sharesMap, downloads: downloadsMap } =
    aggregateActionsByGranularity(actionRows, granularity)
  const signupsMap = aggregateRowsByGranularity(
    signupRows.map((row) => {
      return { day: row.day, count: Number(row.count) }
    }),
    granularity
  )

  const series = generateDateSeries({ start, end, granularity })

  return series.map((dateKey) => {
    return {
      date: dateKey,
      views: viewsMap.get(dateKey) ?? 0,
      studioGenerations: generationsMap.get(dateKey) ?? 0,
      shares: sharesMap.get(dateKey) ?? 0,
      downloads: downloadsMap.get(dateKey) ?? 0,
      signups: signupsMap.get(dateKey) ?? 0
    }
  })
}

export const getAdminChartData = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return PERIOD_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: period }) => {
    const days = PERIOD_DAYS[period]
    const granularity = getChartGranularity(days)
    const now = new Date()
    const yesterday = new Date(truncateToUtcDay(now).getTime() - DAY)
    const start =
      days === null
        ? PLATFORM_LAUNCH_DATE
        : new Date(yesterday.getTime() - days * DAY)

    return fetchChartData({ start, end: yesterday, granularity })
  })

const RECENT_ACTIVITY_SELECT = {
  id: true,
  action: true,
  targetType: true,
  targetId: true,
  metadata: true,
  createdAt: true,
  actingAdmin: {
    select: { name: true, image: true }
  }
} as const satisfies Prisma.AdminAuditLogSelect

type RawAuditLogEntry = Prisma.AdminAuditLogGetPayload<{
  select: typeof RECENT_ACTIVITY_SELECT
}>

export type AuditLogEntry = Omit<
  RawAuditLogEntry,
  'action' | 'targetType' | 'metadata'
> & {
  action: AuditAction
  targetType: AuditTargetType
  metadata: AuditMetadata | null
}

async function fetchRecentActivity() {
  const entries = await prismaClient.adminAuditLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: RECENT_ACTIVITY_SELECT
  })

  return entries as AuditLogEntry[]
}

export const getAdminRecentActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return fetchRecentActivity()
  })

type RawTrendingRow = {
  memeId: string
  title: string
  bunnyId: string
  duration: number
  views: bigint
  bookmarks: bigint
  downloads: bigint
  generations: bigint
  shares: bigint
  score: bigint
}

export type TrendingMeme = {
  meme: {
    id: string
    title: string
    video: { bunnyId: string; duration: number }
  }
  rank: number
  score: number
  views: number
  bookmarks: number
  downloads: number
  generations: number
  shares: number
}

async function fetchTrendingMemes() {
  const since = new Date(Date.now() - TRENDING_DAYS * DAY)

  const rows = await prismaClient.$queryRaw<RawTrendingRow[]>`
    SELECT
      m.id AS "memeId",
      m.title AS title,
      vid."bunny_id" AS "bunnyId",
      vid.duration AS duration,
      COALESCE(v.views, 0) AS views,
      COALESCE(b.bookmarks, 0) AS bookmarks,
      COALESCE(ds.downloads, 0) AS downloads,
      COALESCE(g.generations, 0) AS generations,
      COALESCE(ds.shares, 0) AS shares,
      (
        COALESCE(v.views, 0) * ${TRENDING_WEIGHTS.views}
        + COALESCE(b.bookmarks, 0) * ${TRENDING_WEIGHTS.bookmarks}
        + COALESCE(ds.downloads, 0) * ${TRENDING_WEIGHTS.downloads}
        + COALESCE(g.generations, 0) * ${TRENDING_WEIGHTS.generations}
        + COALESCE(ds.shares, 0) * ${TRENDING_WEIGHTS.shares}
      ) AS score
    FROM "meme" m
    INNER JOIN "video" vid ON vid.id = m."video_id"
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
    WHERE m.status = ${MemeStatus.PUBLISHED}
    AND (
      COALESCE(v.views, 0)
      + COALESCE(b.bookmarks, 0)
      + COALESCE(ds.downloads, 0)
      + COALESCE(g.generations, 0)
      + COALESCE(ds.shares, 0)
    ) > 0
    ORDER BY score DESC
    LIMIT 10
  `

  return rows.map((row, index) => {
    return {
      meme: {
        id: row.memeId,
        title: row.title,
        video: { bunnyId: row.bunnyId, duration: row.duration }
      },
      rank: index + 1,
      score: Number(row.score),
      views: Number(row.views),
      bookmarks: Number(row.bookmarks),
      downloads: Number(row.downloads),
      generations: Number(row.generations),
      shares: Number(row.shares)
    }
  })
}

export const getAdminTrendingMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return fetchTrendingMemes()
  })
