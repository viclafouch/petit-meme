import { createServerOnlyFn } from '@tanstack/react-start'
import { PAGE_SIZE } from '~/constants/admin'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { ActivityEventType } from '~/db/generated/prisma/enums'

type ActivityPageParams = {
  where: Prisma.ActivityEventWhereInput
  page: number
}

export const buildRetainedActivityWhere = (
  where: Prisma.ActivityEventWhereInput,
  retentionDays: number
) => {
  return {
    ...where,
    createdAt: { gte: new Date(Date.now() - retentionDays * DAY) }
  } satisfies Prisma.ActivityEventWhereInput
}

export const ACTIVITY_ROW_SELECT = {
  id: true,
  type: true,
  createdAt: true,
  ipAddress: true,
  country: true,
  metadata: true,
  format: true,
  user: { select: { id: true, name: true, email: true, image: true } },
  meme: { select: { id: true, title: true } }
} as const satisfies Prisma.ActivityEventSelect

export type AdminActivityRow = Prisma.ActivityEventGetPayload<{
  select: typeof ACTIVITY_ROW_SELECT
}>

export const findActivityRows = createServerOnlyFn(
  ({ where, page }: ActivityPageParams) => {
    return prismaClient.activityEvent.findMany({
      where,
      select: ACTIVITY_ROW_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  }
)

export const findActivityPage = createServerOnlyFn(
  async ({ where, page }: ActivityPageParams) => {
    const [rows, total] = await Promise.all([
      findActivityRows({ where, page }),
      prismaClient.activityEvent.count({ where })
    ])

    return { rows, total }
  }
)

export type ActivityTotals = Record<ActivityEventType, number>

const pickDateBound = (
  dates: (Date | null)[],
  choose: (...values: number[]) => number
) => {
  const times = dates.flatMap((date) => {
    return date ? [date.getTime()] : []
  })

  return times.length > 0 ? new Date(choose(...times)) : null
}

export const findActivitySummary = createServerOnlyFn(
  async (where: Prisma.ActivityEventWhereInput) => {
    const groups = await prismaClient.activityEvent.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true }
    })

    const countByType = new Map(
      groups.map((group) => {
        return [group.type, group._count._all] as const
      })
    )

    const countOf = (type: ActivityEventType) => {
      return countByType.get(type) ?? 0
    }

    const totals: ActivityTotals = {
      [ActivityEventType.VIEW]: countOf(ActivityEventType.VIEW),
      [ActivityEventType.DOWNLOAD]: countOf(ActivityEventType.DOWNLOAD),
      [ActivityEventType.SHARE]: countOf(ActivityEventType.SHARE),
      [ActivityEventType.GENERATION]: countOf(ActivityEventType.GENERATION),
      [ActivityEventType.AI_SEARCH]: countOf(ActivityEventType.AI_SEARCH),
      [ActivityEventType.BOOKMARK_ADDED]: countOf(
        ActivityEventType.BOOKMARK_ADDED
      ),
      [ActivityEventType.SIGNUP]: countOf(ActivityEventType.SIGNUP),
      [ActivityEventType.SUBSCRIPTION]: countOf(ActivityEventType.SUBSCRIPTION)
    }

    return {
      totals,
      total: groups.reduce((sum, group) => {
        return sum + group._count._all
      }, 0),
      firstSeenAt: pickDateBound(
        groups.map((group) => {
          return group._min.createdAt
        }),
        Math.min
      ),
      lastSeenAt: pickDateBound(
        groups.map((group) => {
          return group._max.createdAt
        }),
        Math.max
      )
    }
  }
)
