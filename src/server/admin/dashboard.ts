import { z } from 'zod'
import { prismaClient } from '@/db'
import type { Prisma } from '@/db/generated/prisma/client'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { computeDateRanges, truncateToUtcDay } from '@/helpers/date'
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

export type KpiData = {
  current: number
  previous: number
}

export type DashboardStats = {
  kpis: {
    views: KpiData
    newUsers: KpiData
    newMemes: KpiData
    studioGenerations: KpiData
    bookmarks: KpiData
    shares: KpiData
    downloads: KpiData
  }
  totals: {
    publishedMemes: number
    pendingMemes: number
    totalUsers: number
    activePremium: number
  }
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

async function fetchAllTimeStats() {
  const [
    views,
    newUsers,
    newMemes,
    studioGenerations,
    bookmarks,
    shares,
    downloads,
    totals
  ] = await Promise.all([
    prismaClient.memeViewDaily.count(),
    prismaClient.user.count(),
    prismaClient.meme.count({ where: { status: MemeStatus.PUBLISHED } }),
    prismaClient.studioGeneration.count(),
    prismaClient.userBookmark.count(),
    prismaClient.meme.aggregate({
      where: { status: MemeStatus.PUBLISHED },
      _sum: { shareCount: true }
    }),
    prismaClient.meme.aggregate({
      where: { status: MemeStatus.PUBLISHED },
      _sum: { downloadCount: true }
    }),
    fetchTotals()
  ])

  return {
    kpis: {
      views: { current: views, previous: 0 },
      newUsers: { current: newUsers, previous: 0 },
      newMemes: { current: newMemes, previous: 0 },
      studioGenerations: { current: studioGenerations, previous: 0 },
      bookmarks: { current: bookmarks, previous: 0 },
      shares: { current: shares._sum.shareCount ?? 0, previous: 0 },
      downloads: { current: downloads._sum.downloadCount ?? 0, previous: 0 }
    },
    totals
  }
}

async function fetchPeriodStats(days: number) {
  const { now, currentStart, previousStart } = computeDateRanges(days)
  const currentStartDay = truncateToUtcDay(currentStart)
  const previousStartDay = truncateToUtcDay(previousStart)

  const publishedCurrent = {
    status: MemeStatus.PUBLISHED,
    publishedAt: { gte: currentStart, lte: now }
  } as const satisfies Prisma.MemeWhereInput

  const publishedPrevious = {
    status: MemeStatus.PUBLISHED,
    publishedAt: { gte: previousStart, lt: currentStart }
  } as const satisfies Prisma.MemeWhereInput

  const [
    viewsCurrent,
    viewsPrevious,
    newUsersCurrent,
    newUsersPrevious,
    newMemesCurrent,
    newMemesPrevious,
    studioGenerationsCurrent,
    studioGenerationsPrevious,
    bookmarksCurrent,
    bookmarksPrevious,
    sharesCurrent,
    sharesPrevious,
    downloadsCurrent,
    downloadsPrevious,
    totals
  ] = await Promise.all([
    prismaClient.memeViewDaily.count({
      where: { day: { gte: currentStartDay, lte: now } }
    }),
    prismaClient.memeViewDaily.count({
      where: { day: { gte: previousStartDay, lt: currentStartDay } }
    }),
    prismaClient.user.count({
      where: { createdAt: { gte: currentStart, lte: now } }
    }),
    prismaClient.user.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } }
    }),
    prismaClient.meme.count({ where: publishedCurrent }),
    prismaClient.meme.count({ where: publishedPrevious }),
    prismaClient.studioGeneration.count({
      where: { createdAt: { gte: currentStart, lte: now } }
    }),
    prismaClient.studioGeneration.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } }
    }),
    prismaClient.userBookmark.count({
      where: { createdAt: { gte: currentStart, lte: now } }
    }),
    prismaClient.userBookmark.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } }
    }),
    prismaClient.meme.aggregate({
      where: publishedCurrent,
      _sum: { shareCount: true }
    }),
    prismaClient.meme.aggregate({
      where: publishedPrevious,
      _sum: { shareCount: true }
    }),
    prismaClient.meme.aggregate({
      where: publishedCurrent,
      _sum: { downloadCount: true }
    }),
    prismaClient.meme.aggregate({
      where: publishedPrevious,
      _sum: { downloadCount: true }
    }),
    fetchTotals()
  ])

  return {
    kpis: {
      views: { current: viewsCurrent, previous: viewsPrevious },
      newUsers: { current: newUsersCurrent, previous: newUsersPrevious },
      newMemes: { current: newMemesCurrent, previous: newMemesPrevious },
      studioGenerations: {
        current: studioGenerationsCurrent,
        previous: studioGenerationsPrevious
      },
      bookmarks: { current: bookmarksCurrent, previous: bookmarksPrevious },
      shares: {
        current: sharesCurrent._sum.shareCount ?? 0,
        previous: sharesPrevious._sum.shareCount ?? 0
      },
      downloads: {
        current: downloadsCurrent._sum.downloadCount ?? 0,
        previous: downloadsPrevious._sum.downloadCount ?? 0
      }
    },
    totals
  }
}

export const getAdminDashboardStats = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return PERIOD_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: period }) => {
    const days = PERIOD_DAYS[period]

    return days === null ? fetchAllTimeStats() : fetchPeriodStats(days)
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
