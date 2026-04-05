import { createServerFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import { truncateToUtcDay } from '~/helpers/date'
import { adminRequiredMiddleware } from '~/server/user-auth'

const AI_SEARCH_LOG_SELECT = {
  id: true,
  userId: true,
  prompt: true,
  keywords: true,
  memeIds: true,
  locale: true,
  resultCount: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true
    }
  }
} as const satisfies Prisma.AiSearchLogSelect

export type AdminAiSearchLog = Prisma.AiSearchLogGetPayload<{
  select: typeof AI_SEARCH_LOG_SELECT
}>

export const getAdminAiSearchLogs = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    const now = new Date()

    const [logs, totalCount, todayCount, zeroResultCount] = await Promise.all([
      prismaClient.aiSearchLog.findMany({
        select: AI_SEARCH_LOG_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prismaClient.aiSearchLog.count(),
      prismaClient.aiSearchLog.count({
        where: { createdAt: { gte: truncateToUtcDay(now) } }
      }),
      prismaClient.aiSearchLog.count({
        where: { resultCount: 0 }
      })
    ])

    return {
      logs,
      stats: {
        totalCount,
        todayCount,
        zeroResultCount,
        displayedCount: logs.length
      }
    }
  })
