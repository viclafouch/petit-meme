import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import {
  ACTIVITY_IP_RETENTION_DAYS,
  ACTIVITY_RETENTION_DAYS
} from '~/constants/activity'
import {
  INACTIVITY_ANONYMIZATION_YEARS,
  LAST_ACTIVE_AT_TRACKING_START,
  UNVERIFIED_RETENTION_DAYS
} from '~/constants/auth'
import { DAY, DAYS_PER_YEAR } from '~/constants/time'
import { serverEnv } from '~/env/server'
import { auth } from '~/lib/auth'
import { cronLogger } from '~/lib/logger'
import { verifyCronSecret } from '~/utils/cron-auth'

const log = cronLogger.child({ job: 'cleanup' })

const VERIFICATION_GRACE_PERIOD_MS = DAY
const VIEW_RETENTION_DAYS = 90
const ANALYTICS_RETENTION_DAYS = 365
const AUDIT_LOG_RETENTION_YEARS = 2
const MASKED_ID_LENGTH = 8

const maskId = (id: string) => {
  return id.slice(0, MASKED_ID_LENGTH)
}

const runRetentionCleanup = async () => {
  const now = new Date()

  const deletedSessions = await prismaClient.session.deleteMany({
    where: { expiresAt: { lt: now } }
  })

  log.info({ count: deletedSessions.count }, 'Deleted expired sessions')

  const verificationCutoff = new Date(
    now.getTime() - VERIFICATION_GRACE_PERIOD_MS
  )

  const deletedVerifications = await prismaClient.verification.deleteMany({
    where: { expiresAt: { lt: verificationCutoff } }
  })

  log.info(
    { count: deletedVerifications.count },
    'Deleted expired verifications'
  )

  const viewCutoff = new Date(now.getTime() - VIEW_RETENTION_DAYS * DAY)

  const viewCountsByMeme = await prismaClient.memeViewDaily.groupBy({
    by: ['memeId'],
    where: { day: { lt: viewCutoff } },
    _count: { id: true }
  })

  if (viewCountsByMeme.length > 0) {
    await prismaClient.$transaction(
      viewCountsByMeme.map((group) => {
        return prismaClient.meme.update({
          where: { id: group.memeId },
          data: { viewCount: { increment: group._count.id } }
        })
      })
    )

    const deletedViews = await prismaClient.memeViewDaily.deleteMany({
      where: { day: { lt: viewCutoff } }
    })

    log.info(
      {
        memesAggregated: viewCountsByMeme.length,
        viewsDeleted: deletedViews.count
      },
      'View records aggregated and pruned'
    )
  } else {
    log.debug('No old view records to clean')
  }

  const analyticsCutoff = new Date(
    now.getTime() - ANALYTICS_RETENTION_DAYS * DAY
  )

  const deletedGenerations = await prismaClient.studioGeneration.deleteMany({
    where: { createdAt: { lt: analyticsCutoff } }
  })

  log.info(
    { count: deletedGenerations.count },
    'Deleted old studio generations (365d)'
  )

  const deletedActions = await prismaClient.memeActionDaily.deleteMany({
    where: { day: { lt: analyticsCutoff } }
  })

  log.info(
    { count: deletedActions.count },
    'Deleted old meme action daily records (365d)'
  )

  const deletedAiSearchLogs = await prismaClient.aiSearchLog.deleteMany({
    where: { createdAt: { lt: analyticsCutoff } }
  })

  log.info(
    { count: deletedAiSearchLogs.count },
    'Deleted old AI search logs (365d)'
  )

  const auditLogCutoff = new Date(
    now.getTime() - AUDIT_LOG_RETENTION_YEARS * DAYS_PER_YEAR * DAY
  )

  const deletedAuditLogs = await prismaClient.adminAuditLog.deleteMany({
    where: { createdAt: { lt: auditLogCutoff } }
  })

  log.info({ count: deletedAuditLogs.count }, 'Deleted old audit logs (2y)')

  const activityCutoff = new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * DAY)

  const deletedActivityEvents = await prismaClient.activityEvent.deleteMany({
    where: { createdAt: { lt: activityCutoff } }
  })

  log.info(
    { count: deletedActivityEvents.count },
    'Deleted old activity events (90d)'
  )

  const activityIpCutoff = new Date(
    now.getTime() - ACTIVITY_IP_RETENTION_DAYS * DAY
  )

  const anonymizedActivityEvents = await prismaClient.activityEvent.updateMany({
    where: {
      createdAt: { lt: activityIpCutoff },
      OR: [{ ipAddress: { not: null } }, { dedupKey: { not: null } }]
    },
    data: { ipAddress: null, country: null, dedupKey: null }
  })

  log.info(
    { count: anonymizedActivityEvents.count },
    'Anonymized activity events (30d)'
  )

  const anonymizationCutoff = new Date(
    now.getTime() - INACTIVITY_ANONYMIZATION_YEARS * DAYS_PER_YEAR * DAY
  )

  const inactiveSinceLastActivity = {
    lastActiveAt: { lt: anonymizationCutoff }
  }
  const inactiveSinceBeforeTracking = {
    lastActiveAt: null,
    updatedAt: { lt: anonymizationCutoff }
  }
  const isTrackingOlderThanCutoff =
    LAST_ACTIVE_AT_TRACKING_START < anonymizationCutoff

  const usersToAnonymize = await prismaClient.user.findMany({
    where: {
      isAnonymized: false,
      OR: isTrackingOlderThanCutoff
        ? [inactiveSinceLastActivity, inactiveSinceBeforeTracking]
        : [inactiveSinceLastActivity]
    },
    select: { id: true }
  })

  let anonymizedCount = 0

  if (usersToAnonymize.length > 0) {
    const userIds = usersToAnonymize.map((user) => {
      return user.id
    })

    anonymizedCount = await prismaClient.$executeRaw`
      UPDATE "user"
      SET
        "name" = 'Utilisateur supprimé',
        "email" = 'deleted-' || LEFT(encode(sha256(CAST("id" AS bytea)), 'hex'), 8) || '@anonymized.local',
        "image" = NULL,
        "provider_avatar" = NULL,
        "email_verified" = false,
        "is_anonymized" = true,
        "last_active_at" = NULL,
        "updated_at" = ${now}
      WHERE "id" = ANY(${userIds}::text[])`

    for (const user of usersToAnonymize) {
      log.info({ userId: maskId(user.id) }, 'Anonymized user')
    }
  }

  log.info({ anonymizedCount }, 'Anonymization completed')

  return {
    deletedSessions: deletedSessions.count,
    deletedVerifications: deletedVerifications.count,
    viewsAggregated: viewCountsByMeme.length,
    deletedGenerations: deletedGenerations.count,
    deletedActions: deletedActions.count,
    deletedAuditLogs: deletedAuditLogs.count,
    deletedAiSearchLogs: deletedAiSearchLogs.count,
    deletedActivityEvents: deletedActivityEvents.count,
    anonymizedActivityEvents: anonymizedActivityEvents.count,
    anonymizedCount
  }
}

const runUnverifiedCleanup = async () => {
  const cutoffDate = new Date(Date.now() - UNVERIFIED_RETENTION_DAYS * DAY)

  const abandonedSignUps = await prismaClient.user.findMany({
    where: {
      emailVerified: false,
      isAnonymized: false,
      createdAt: { lt: cutoffDate },
      OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoffDate } }],
      accounts: { every: { providerId: 'credential' } },
      bookmarks: { none: {} }
    },
    select: { id: true, email: true }
  })

  if (abandonedSignUps.length === 0) {
    log.info('No abandoned sign ups to clean up')

    return { deletedCount: 0, errorCount: 0 }
  }

  const userIds = abandonedSignUps.map((user) => {
    return user.id
  })

  const subscriptions = await prismaClient.subscription.findMany({
    where: { referenceId: { in: userIds } },
    select: { referenceId: true }
  })

  const subscribedUserIds = new Set(
    subscriptions.map((subscription) => {
      return subscription.referenceId
    })
  )

  const deletableUsers = abandonedSignUps.filter((user) => {
    return !subscribedUserIds.has(user.id)
  })

  const { internalAdapter } = await auth.$context
  let deletedCount = 0
  let errorCount = 0

  for (const user of deletableUsers) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- each deletion calls Stripe and Resend through cleanupUserData, one account at a time
      await internalAdapter.deleteUser(user.id)
      log.info({ email: user.email }, 'Deleted abandoned sign up')
      deletedCount += 1
    } catch (error) {
      log.error({ error, email: user.email }, 'Failed to delete user')
      errorCount += 1
    }
  }

  log.info({ deletedCount, errorCount }, 'Unverified cleanup completed')

  return { deletedCount, errorCount }
}

export const Route = createFileRoute('/api/cron/cleanup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret({
          request,
          secret: serverEnv.CRON_SECRET
        })

        if (authError) {
          return authError
        }

        try {
          const retention = await runRetentionCleanup()
          const unverified = await runUnverifiedCleanup()

          return Response.json({ success: true, retention, unverified })
        } catch (error) {
          log.error({ error }, 'Cleanup cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
