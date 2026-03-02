/* eslint-disable no-await-in-loop */
import { createHash } from 'node:crypto'
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

const hashId = (id: string) => {
  return createHash('sha256').update(id).digest('hex').slice(0, 8)
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

  const candidateUsers = await prismaClient.user.findMany({
    where: {
      isAnonymized: false,
      updatedAt: { lt: anonymizationCutoff }
    },
    select: { id: true }
  })

  let anonymizedCount = 0

  for (const user of candidateUsers) {
    const lastSession = await prismaClient.session.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })

    if (lastSession && lastSession.createdAt > anonymizationCutoff) {
      continue
    }

    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        name: 'Utilisateur supprimé',
        email: `deleted-${hashId(user.id)}@anonymized.local`,
        image: null,
        emailVerified: false,
        isAnonymized: true,
        updatedAt: now
      }
    })

    log.info({ userId: maskId(user.id) }, 'Anonymized user')
    anonymizedCount += 1
  }

  log.info({ anonymizedCount }, 'Anonymization completed')

  const deletedRateLimits = await prismaClient.rateLimit.deleteMany({
    where: { lastRequest: { lt: BigInt(Date.now() - DAY) } }
  })

  log.info(
    { count: deletedRateLimits.count },
    'Deleted expired rate limit entries'
  )

  return {
    deletedSessions: deletedSessions.count,
    deletedVerifications: deletedVerifications.count,
    viewsAggregated: viewCountsByMeme.length,
    deletedGenerations: deletedGenerations.count,
    deletedActions: deletedActions.count,
    deletedAuditLogs: deletedAuditLogs.count,
    anonymizedCount,
    deletedRateLimits: deletedRateLimits.count
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
