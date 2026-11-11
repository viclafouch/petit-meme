import { createServerFn } from '@tanstack/react-start'
import {
  ACTIVITY_FILTERS_SCHEMA,
  type ActivityFilters,
  type ActivityScope
} from '~/constants/activity'
import { DASHBOARD_FEED_SIZE } from '~/constants/admin'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import {
  ACTIVITY_ROW_SELECT,
  findActivityPage
} from '~/server/admin/activity/activity.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'

const USER_ID_FILTER_BY_SCOPE = {
  all: undefined,
  users: { not: null },
  anonymous: null
} as const satisfies Record<
  ActivityScope,
  Prisma.ActivityEventWhereInput['userId']
>

const buildActivityWhere = ({
  types,
  scope,
  search
}: ActivityFilters): Prisma.ActivityEventWhereInput => {
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

export const listAdminActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(ACTIVITY_FILTERS_SCHEMA)
  .handler(({ data }) => {
    return findActivityPage({
      where: buildActivityWhere(data),
      page: data.page
    })
  })

export const listAdminRecentActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(() => {
    return prismaClient.activityEvent.findMany({
      take: DASHBOARD_FEED_SIZE,
      orderBy: { createdAt: 'desc' },
      select: ACTIVITY_ROW_SELECT
    })
  })
