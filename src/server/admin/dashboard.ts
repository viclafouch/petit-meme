import { z } from 'zod'
import { DAY } from '@/constants/time'
import { prismaClient } from '@/db'
import type { Prisma } from '@/db/generated/prisma/client'
import { MemeStatus } from '@/db/generated/prisma/enums'
import {
  type ChartGranularity,
  generateDateSeries,
  getChartGranularity,
  truncateToGranularity
} from '@/helpers/date'
import type {
  AuditAction,
  AuditMetadata,
  AuditTargetType
} from '@/server/admin/audit'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'

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

  const [viewRows, generationRows, actionRows] = await Promise.all([
    prismaClient.memeViewDaily.groupBy({
      by: ['day'],
      where: { day: dateRange },
      _count: { id: true }
    }),
    prismaClient.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM studio_generation
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY 1
    `,
    prismaClient.memeActionDaily.groupBy({
      by: ['day', 'action'],
      where: { day: dateRange },
      _sum: { count: true }
    })
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

  const series = generateDateSeries({ start, end, granularity })

  return series.map((dateKey) => {
    return {
      date: dateKey,
      views: viewsMap.get(dateKey) ?? 0,
      studioGenerations: generationsMap.get(dateKey) ?? 0,
      shares: sharesMap.get(dateKey) ?? 0,
      downloads: downloadsMap.get(dateKey) ?? 0
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
    const start =
      days === null
        ? PLATFORM_LAUNCH_DATE
        : new Date(now.getTime() - days * DAY)

    return fetchChartData({ start, end: now, granularity })
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
