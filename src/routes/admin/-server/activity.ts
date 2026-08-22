import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import { ACTIVITY_FILTERS_SCHEMA } from '~/constants/activity'
import type { ActivityFilters, ActivityScope } from '~/constants/activity'
import type { Prisma } from '~/db/generated/prisma/client'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { PAGE_SIZE, DASHBOARD_FEED_SIZE } from '~/routes/admin/-lib/constants'
import { adminRequiredMiddleware } from '~/server/user-auth'

const ACTIVITY_ROW_SELECT = {
  id: true,
  type: true,
  createdAt: true,
  ipAddress: true,
  country: true,
  metadata: true,
  user: { select: { id: true, name: true, email: true, image: true } },
  meme: { select: { id: true, title: true } }
} as const satisfies Prisma.ActivityEventSelect

export type AdminActivityRow = Prisma.ActivityEventGetPayload<{
  select: typeof ACTIVITY_ROW_SELECT
}>

type ActivityPageParams = {
  where: Prisma.ActivityEventWhereInput
  page: number
}

export const fetchActivityRows = createServerOnlyFn(
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

export const fetchActivityPage = createServerOnlyFn(
  async ({ where, page }: ActivityPageParams) => {
    const [rows, total] = await Promise.all([
      fetchActivityRows({ where, page }),
      prismaClient.activityEvent.count({ where })
    ])

    return { rows, total }
  }
)

export type ActivityTotals = Record<ActivityEventType, number>

function pickDateBound(
  dates: (Date | null)[],
  choose: (...values: number[]) => number
) {
  const times = dates.flatMap((date) => {
    return date ? [date.getTime()] : []
  })

  return times.length > 0 ? new Date(choose(...times)) : null
}

export const fetchActivitySummary = createServerOnlyFn(
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

    const totals = Object.fromEntries(
      Object.values(ActivityEventType).map((type) => {
        return [type, countByType.get(type) ?? 0] as const
      })
    ) as ActivityTotals

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

const USER_ID_FILTER_BY_SCOPE = {
  all: undefined,
  users: { not: null },
  anonymous: null
} as const satisfies Record<
  ActivityScope,
  Prisma.ActivityEventWhereInput['userId']
>

function buildActivityWhere({
  types,
  scope,
  search
}: ActivityFilters): Prisma.ActivityEventWhereInput {
  return {
    type: types && types.length > 0 ? { in: types } : undefined,
    userId: USER_ID_FILTER_BY_SCOPE[scope],
    OR: search
      ? [
          { ipAddress: { contains: search } },
          { user: { email: { contains: search, mode: 'insensitive' } } }
        ]
      : undefined
  }
}

export const getAdminActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(ACTIVITY_FILTERS_SCHEMA)
  .handler(({ data }) => {
    return fetchActivityPage({
      where: buildActivityWhere(data),
      page: data.page
    })
  })

export const getAdminRecentActivityEvents = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return prismaClient.activityEvent.findMany({
      take: DASHBOARD_FEED_SIZE,
      orderBy: { createdAt: 'desc' },
      select: ACTIVITY_ROW_SELECT
    })
  })
