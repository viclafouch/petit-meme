import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import {
  ACTIVITY_IP_RETENTION_DAYS,
  ACTIVITY_PAGE_SCHEMA
} from '~/constants/activity'
import { DAY } from '~/constants/time'
import {
  fetchActivityRows,
  fetchActivitySummary
} from '~/routes/admin/-server/activity'
import { adminRequiredMiddleware } from '~/server/user-auth'

const VISITOR_LIST_SIZE = 8

const IP_ADDRESS_SCHEMA = z.string().min(1).max(45)

function buildVisitorWhere(ipAddress: string) {
  return {
    ipAddress,
    createdAt: { gte: new Date(Date.now() - ACTIVITY_IP_RETENTION_DAYS * DAY) }
  }
}

export const getAdminVisitorDetail = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(IP_ADDRESS_SCHEMA)
  .handler(async ({ data: ipAddress }) => {
    const where = buildVisitorWhere(ipAddress)

    const [summary, latestCountry, memeGroups, userAgentGroups, userGroups] =
      await Promise.all([
        fetchActivitySummary(where),
        prismaClient.activityEvent.findFirst({
          where: { ...where, country: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { country: true }
        }),
        prismaClient.activityEvent.groupBy({
          by: ['memeId'],
          where: { ...where, memeId: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { memeId: 'desc' } },
          take: VISITOR_LIST_SIZE
        }),
        prismaClient.activityEvent.groupBy({
          by: ['userAgent'],
          where: { ...where, userAgent: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { userAgent: 'desc' } },
          take: VISITOR_LIST_SIZE
        }),
        prismaClient.activityEvent.groupBy({
          by: ['userId'],
          where: { ...where, userId: { not: null } },
          _count: { _all: true },
          _max: { createdAt: true },
          orderBy: { _max: { createdAt: 'desc' } },
          take: VISITOR_LIST_SIZE
        })
      ])

    const memeCounts = memeGroups.flatMap((group) => {
      return group.memeId
        ? [{ memeId: group.memeId, eventCount: group._count._all }]
        : []
    })

    const userCounts = userGroups.flatMap((group) => {
      return group.userId
        ? [
            {
              userId: group.userId,
              eventCount: group._count._all,
              lastSeenAt: group._max.createdAt
            }
          ]
        : []
    })

    const [memes, users] = await Promise.all([
      prismaClient.meme.findMany({
        where: {
          id: {
            in: memeCounts.map((entry) => {
              return entry.memeId
            })
          }
        },
        select: { id: true, title: true }
      }),
      prismaClient.user.findMany({
        where: {
          id: {
            in: userCounts.map((entry) => {
              return entry.userId
            })
          }
        },
        select: { id: true, name: true, email: true, image: true }
      })
    ])

    const memeById = new Map(
      memes.map((meme) => {
        return [meme.id, meme] as const
      })
    )

    const userById = new Map(
      users.map((user) => {
        return [user.id, user] as const
      })
    )

    return {
      ipAddress,
      country: latestCountry?.country ?? null,
      summary,
      memes: memeCounts.flatMap((entry) => {
        const meme = memeById.get(entry.memeId)

        return meme ? [{ meme, eventCount: entry.eventCount }] : []
      }),
      userAgents: userAgentGroups.flatMap((group) => {
        return group.userAgent
          ? [{ userAgent: group.userAgent, eventCount: group._count._all }]
          : []
      }),
      users: userCounts.flatMap((entry) => {
        const user = userById.get(entry.userId)

        return user
          ? [
              {
                user,
                eventCount: entry.eventCount,
                lastSeenAt: entry.lastSeenAt
              }
            ]
          : []
      })
    }
  })

export type AdminVisitorDetailPayload = Awaited<
  ReturnType<typeof getAdminVisitorDetail>
>

const VISITOR_ACTIVITY_SCHEMA = ACTIVITY_PAGE_SCHEMA.extend({
  ipAddress: IP_ADDRESS_SCHEMA
})

export type AdminVisitorActivityFilters = z.infer<
  typeof VISITOR_ACTIVITY_SCHEMA
>

export const getAdminVisitorActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(VISITOR_ACTIVITY_SCHEMA)
  .handler(({ data }) => {
    return fetchActivityRows({
      where: buildVisitorWhere(data.ipAddress),
      page: data.page
    })
  })
