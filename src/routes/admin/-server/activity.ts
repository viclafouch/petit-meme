import { createServerFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import { ACTIVITY_FILTERS_SCHEMA } from '~/constants/activity'
import type { ActivityFilters, ActivityScope } from '~/constants/activity'
import type { Prisma } from '~/db/generated/prisma/client'
import { PAGE_SIZE } from '~/routes/admin/-components/admin-table'
import { DASHBOARD_FEED_SIZE } from '~/routes/admin/-lib/constants'
import { adminRequiredMiddleware } from '~/server/user-auth'

const ACTIVITY_ROW_SELECT = {
  id: true,
  type: true,
  createdAt: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
  user: { select: { id: true, name: true, email: true, image: true } },
  meme: { select: { id: true, title: true } }
} as const satisfies Prisma.ActivityEventSelect

export type AdminActivityRow = Prisma.ActivityEventGetPayload<{
  select: typeof ACTIVITY_ROW_SELECT
}>

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
  .handler(async ({ data }) => {
    const where = buildActivityWhere(data)

    const [rows, total] = await Promise.all([
      prismaClient.activityEvent.findMany({
        where,
        select: ACTIVITY_ROW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE
      }),
      prismaClient.activityEvent.count({ where })
    ])

    return { rows, total }
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
