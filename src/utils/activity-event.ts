import { createServerOnlyFn } from '@tanstack/react-start'
// Vercel-specific: replace with platform equivalent if migrating (e.g. Railway)
import { waitUntil } from '@vercel/functions'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import type { ActivityEventType } from '~/db/generated/prisma/enums'
import { extractClientIp } from '~/helpers/request'
import { matchIsUserAdmin } from '~/lib/role'
import type { SessionUser, UserRoleHolder } from '~/lib/role'
import { captureWithFeature } from '~/lib/sentry'

type ActivityActor = Pick<SessionUser, 'id'> & UserRoleHolder

type RecordActivityEventParams = {
  type: ActivityEventType
  actor?: ActivityActor
  headers?: Headers
  memeId?: string
  dedupKey?: string
  metadata?: Prisma.InputJsonValue
}

export const recordActivityEvent = createServerOnlyFn(
  ({
    type,
    actor,
    headers,
    memeId,
    dedupKey,
    metadata
  }: RecordActivityEventParams) => {
    if (actor && matchIsUserAdmin(actor)) {
      return
    }

    waitUntil(
      prismaClient.activityEvent
        .createMany({
          data: [
            {
              type,
              userId: actor?.id,
              memeId,
              dedupKey,
              metadata,
              ipAddress: headers ? extractClientIp(headers) : undefined,
              userAgent: headers?.get('user-agent') ?? undefined
            }
          ],
          skipDuplicates: true
        })
        .catch((error: unknown) => {
          captureWithFeature(error, 'activity-event')
        })
    )
  }
)
