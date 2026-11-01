import { createServerOnlyFn } from '@tanstack/react-start'
import { waitUntil } from '@vercel/functions'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import type {
  ActivityEventType,
  MemeExportFormat
} from '~/db/generated/prisma/enums'
import { extractClientCountry, extractClientIp } from '~/helpers/request'
import {
  matchIsUserAdmin,
  type SessionUser,
  type UserRoleHolder
} from '~/lib/role'
import { captureWithFeature } from '~/lib/sentry'

type ActivityActor = Pick<SessionUser, 'id'> & UserRoleHolder

type RecordActivityEventParams = {
  type: ActivityEventType
  actor?: ActivityActor
  headers?: Headers
  memeId?: string
  dedupKey?: string
  metadata?: Prisma.InputJsonValue
  format?: MemeExportFormat
}

const createActivityEvent = async (
  activityEvent: Prisma.ActivityEventCreateManyInput
) => {
  try {
    await prismaClient.activityEvent.createMany({
      data: [activityEvent],
      skipDuplicates: true
    })
  } catch (error) {
    captureWithFeature(error, 'activity-event')
  }
}

export const recordActivityEvent = createServerOnlyFn(
  ({
    type,
    actor,
    headers,
    memeId,
    dedupKey,
    metadata,
    format
  }: RecordActivityEventParams) => {
    if (actor && matchIsUserAdmin(actor)) {
      return
    }

    waitUntil(
      createActivityEvent({
        type,
        userId: actor?.id,
        memeId,
        dedupKey,
        metadata,
        format,
        ipAddress: headers ? extractClientIp(headers) : undefined,
        country: headers ? extractClientCountry(headers) : undefined,
        userAgent: headers?.get('user-agent') ?? undefined
      })
    )
  }
)
