import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { DASHBOARD_FEED_SIZE } from '~/constants/admin'
import { TRENDING_CATEGORY_DAYS } from '~/constants/meme'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import {
  type ChartGranularity,
  generateDateSeries,
  getChartGranularity,
  truncateToGranularity,
  truncateToUtcDay
} from '~/helpers/date'
import { READY_MEME_DRAFT_WHERE } from '~/server/admin/ai-assist/meme-fill.server'
import type { AuditMetadata } from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import {
  buildTrendingSignalsSql,
  TRENDING_ACTIVITY_SQL,
  TRENDING_SCORE_SQL
} from '~/server/meme/trending.server'
import { PREMIUM_SUBSCRIPTION_WHERE } from '~/server/subscription/subscription.server'

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
  readyMemeDrafts: number
  totalUsers: number
  paidPremium: number
  grantedPremium: number
}

const findTotals = async () => {
  const [
    publishedMemes,
    pendingMemes,
    readyMemeDrafts,
    totalUsers,
    paidPremium,
    grantedPremium
  ] = await Promise.all([
    prismaClient.meme.count({ where: { status: MemeStatus.PUBLISHED } }),
    prismaClient.meme.count({ where: { status: MemeStatus.PENDING } }),
    prismaClient.meme.count({ where: READY_MEME_DRAFT_WHERE }),
    prismaClient.user.count(),
    prismaClient.subscription.count({
      where: PREMIUM_SUBSCRIPTION_WHERE
    }),
    prismaClient.user.count({ where: { premiumGrantedAt: { not: null } } })
  ])

  return {
    publishedMemes,
    pendingMemes,
    readyMemeDrafts,
    totalUsers,
    paidPremium,
    grantedPremium
  }
}

export const getAdminDashboardTotals = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return findTotals()
  })

const ADMIN_TRENDING_MEMES_COUNT = 10

const PLATFORM_LAUNCH_DATE = new Date('2025-01-01T00:00:00.000Z')

export type ChartDataPoint = {
  date: string
  views: number
  studioGenerations: number
  shares: number
  downloads: number
  signups: number
  aiSearches: number
}

const aggregateRowsByGranularity = (
  rows: { day: Date; count: number }[],
  granularity: ChartGranularity
) => {
  const map = new Map<string, number>()

  for (const row of rows) {
    const key = truncateToGranularity(row.day, granularity)
    map.set(key, (map.get(key) ?? 0) + row.count)
  }

  return map
}

const aggregateActionsByGranularity = (
  rows: { day: Date; action: string; _sum: { count: number | null } }[],
  granularity: ChartGranularity
) => {
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

type DailyCountTable = 'studio_generation' | 'user' | 'ai_search_log'

const countRowsByDay = async (
  table: DailyCountTable,
  start: Date,
  end: Date
) => {
  const rows = await prismaClient.$queryRaw<DailyCountRow[]>`
    SELECT date_trunc('day', "created_at") AS day, COUNT(*) AS count
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "created_at" >= ${start} AND "created_at" <= ${end}
    GROUP BY 1
  `

  return rows.map((row) => {
    return { day: row.day, count: Number(row.count) }
  })
}

type FindChartDataParams = {
  start: Date
  end: Date
  granularity: ChartGranularity
}

const findChartData = async ({
  start,
  end,
  granularity
}: FindChartDataParams) => {
  const dateRange = { gte: start, lte: end }

  const [viewRows, generationRows, actionRows, signupRows, aiSearchRows] =
    await Promise.all([
      prismaClient.memeViewDaily.groupBy({
        by: ['day'],
        where: { day: dateRange },
        _count: { id: true }
      }),
      countRowsByDay('studio_generation', start, end),
      prismaClient.memeActionDaily.groupBy({
        by: ['day', 'action'],
        where: { day: dateRange },
        _sum: { count: true }
      }),
      countRowsByDay('user', start, end),
      countRowsByDay('ai_search_log', start, end)
    ])

  const viewsMap = aggregateRowsByGranularity(
    viewRows.map((row) => {
      return { day: row.day, count: row._count.id }
    }),
    granularity
  )
  const generationsMap = aggregateRowsByGranularity(generationRows, granularity)
  const { shares: sharesMap, downloads: downloadsMap } =
    aggregateActionsByGranularity(actionRows, granularity)
  const signupsMap = aggregateRowsByGranularity(signupRows, granularity)
  const aiSearchesMap = aggregateRowsByGranularity(aiSearchRows, granularity)

  const series = generateDateSeries({ start, end, granularity })

  return series.map((dateKey) => {
    return {
      date: dateKey,
      views: viewsMap.get(dateKey) ?? 0,
      studioGenerations: generationsMap.get(dateKey) ?? 0,
      shares: sharesMap.get(dateKey) ?? 0,
      downloads: downloadsMap.get(dateKey) ?? 0,
      signups: signupsMap.get(dateKey) ?? 0,
      aiSearches: aiSearchesMap.get(dateKey) ?? 0
    }
  })
}

export const getAdminDashboardChart = createServerFn({ method: 'GET' })
  .validator((data) => {
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

    return findChartData({ start, end: yesterday, granularity })
  })

const RECENT_AUDIT_SELECT = {
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
  select: typeof RECENT_AUDIT_SELECT
}>

export type AuditLogEntry = Omit<RawAuditLogEntry, 'metadata'> & {
  metadata: AuditMetadata
}

const AUDIT_METADATA_SCHEMA = z
  .object({
    title: z.string(),
    slug: z.string(),
    banReason: z.string(),
    from: z.string(),
    to: z.string(),
    source: z.string()
  })
  .partial() satisfies z.ZodType<AuditMetadata>

const parseAuditMetadata = (metadata: RawAuditLogEntry['metadata']) => {
  const result = AUDIT_METADATA_SCHEMA.safeParse(metadata)

  return result.success ? result.data : {}
}

const findRecentAudit = async () => {
  const entries = await prismaClient.adminAuditLog.findMany({
    take: DASHBOARD_FEED_SIZE,
    orderBy: { createdAt: 'desc' },
    select: RECENT_AUDIT_SELECT
  })

  return entries.map((entry) => {
    return {
      ...entry,
      metadata: parseAuditMetadata(entry.metadata)
    } satisfies AuditLogEntry
  })
}

export const listAdminRecentAudit = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return findRecentAudit()
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

const findTrendingMemes = async () => {
  const since = new Date(Date.now() - TRENDING_CATEGORY_DAYS * DAY)

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
      ${TRENDING_SCORE_SQL} AS score
    FROM "meme" m
    INNER JOIN "video" vid ON vid.id = m."video_id"
    ${buildTrendingSignalsSql(since)}
    WHERE m.status = ${MemeStatus.PUBLISHED}
    AND ${TRENDING_ACTIVITY_SQL} > 0
    ORDER BY score DESC
    LIMIT ${ADMIN_TRENDING_MEMES_COUNT}
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

export const listAdminTrendingMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return findTrendingMemes()
  })
