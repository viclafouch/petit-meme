import { createServerFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import { adminRequiredMiddleware } from '~/server/user-auth'

const AI_SEARCH_LOG_SELECT = {
  id: true,
  userId: true,
  prompt: true,
  query: true,
  categorySlugs: true,
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
    const [logs, totalCount, todayCount] = await Promise.all([
      prismaClient.aiSearchLog.findMany({
        select: AI_SEARCH_LOG_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prismaClient.aiSearchLog.count(),
      prismaClient.aiSearchLog.count({
        where: {
          createdAt: {
            gte: new Date(
              Date.UTC(
                new Date().getUTCFullYear(),
                new Date().getUTCMonth(),
                new Date().getUTCDate()
              )
            )
          }
        }
      })
    ])

    const zeroResultCount = logs.filter((log) => {
      return log.resultCount === 0
    }).length

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
