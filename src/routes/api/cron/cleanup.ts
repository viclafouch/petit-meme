import { DAY } from '@/constants/time'
import { prismaClient } from '@/db'
import { cronLogger } from '@/lib/logger'
import { verifyCronSecret } from '@/utils/cron-auth'
import { createFileRoute } from '@tanstack/react-router'

const log = cronLogger.child({ job: 'cleanup' })

const VERIFICATION_GRACE_PERIOD_MS = DAY
const VIEW_RETENTION_DAYS = 90
const ANALYTICS_RETENTION_DAYS = 365
const AUDIT_LOG_RETENTION_YEARS = 2
const ANONYMIZATION_YEARS = 3
const UNVERIFIED_RETENTION_DAYS = 30

const maskId = (id: string) => {
  return id.slice(0, 8)
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

  const auditLogCutoff = new Date(
    now.getTime() - AUDIT_LOG_RETENTION_YEARS * 365 * DAY
  )

  const deletedAuditLogs = await prismaClient.adminAuditLog.deleteMany({
    where: { createdAt: { lt: auditLogCutoff } }
  })

  log.info({ count: deletedAuditLogs.count }, 'Deleted old audit logs (2y)')

  const anonymizationCutoff = new Date(
    now.getTime() - ANONYMIZATION_YEARS * 365 * DAY
  )

  const usersToAnonymize = await prismaClient.$queryRaw<{ id: string }[]>`
    SELECT u."id"
    FROM "user" u
    LEFT JOIN LATERAL (
      SELECT s."created_at"
      FROM "session" s
      WHERE s."user_id" = u."id"
      ORDER BY s."created_at" DESC
      LIMIT 1
    ) latest_session ON true
    WHERE u."is_anonymized" = false
      AND u."updated_at" < ${anonymizationCutoff}
      AND (latest_session."created_at" IS NULL OR latest_session."created_at" < ${anonymizationCutoff})`

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
        "email_verified" = false,
        "is_anonymized" = true,
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
    anonymizedCount
  }
}

const runUnverifiedCleanup = async () => {
  const cutoffDate = new Date(Date.now() - UNVERIFIED_RETENTION_DAYS * DAY)

  const unverifiedUsers = await prismaClient.user.findMany({
    where: {
      emailVerified: false,
      createdAt: { lt: cutoffDate },
      bookmarks: { none: {} }
    },
    select: { id: true, email: true }
  })

  if (unverifiedUsers.length === 0) {
    log.info('No unverified users to clean up')

    return { deletedCount: 0, errorCount: 0 }
  }

  const userIds = unverifiedUsers.map((user) => {
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

  const deletableUsers = unverifiedUsers.filter((user) => {
    return !subscribedUserIds.has(user.id)
  })

  if (deletableUsers.length === 0) {
    log.info('No unverified users without subscriptions to clean up')

    return { deletedCount: 0, errorCount: 0 }
  }

  const results = await Promise.allSettled(
    deletableUsers.map((user) => {
      return prismaClient.user.delete({ where: { id: user.id } })
    })
  )

  let deletedCount = 0
  let errorCount = 0

  for (const [index, result] of results.entries()) {
    const user = deletableUsers[index]

    if (!user) {
      continue
    }

    if (result.status === 'fulfilled') {
      log.info({ email: user.email }, 'Deleted unverified user')
      deletedCount += 1
    } else {
      log.error(
        { err: result.reason, email: user.email },
        'Failed to delete user'
      )
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
        const authError = verifyCronSecret(request)

        if (authError) {
          return authError
        }

        try {
          const retention = await runRetentionCleanup()
          const unverified = await runUnverifiedCleanup()

          return Response.json({ success: true, retention, unverified })
        } catch (error) {
          log.error({ err: error }, 'Cleanup cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
