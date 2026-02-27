/* eslint-disable no-await-in-loop */
import { createHash } from 'node:crypto'
import { DAY } from '@/constants/time'
import { prismaClient } from '@/db'
import { cronLogger } from '@/lib/logger'

const log = cronLogger.child({ job: 'cleanup-retention' })

const VERIFICATION_GRACE_PERIOD_MS = DAY
const VIEW_RETENTION_DAYS = 90
const ANALYTICS_RETENTION_DAYS = 365
const AUDIT_LOG_RETENTION_YEARS = 2
const ANONYMIZATION_YEARS = 3

const maskId = (id: string) => {
  return id.slice(0, 8)
}

const hashId = (id: string) => {
  return createHash('sha256').update(id).digest('hex').slice(0, 8)
}

const task = async () => {
  const now = new Date()

  const deletedSessions = await prismaClient.session.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  })

  log.info({ count: deletedSessions.count }, 'Deleted expired sessions')

  const verificationCutoff = new Date(
    now.getTime() - VERIFICATION_GRACE_PERIOD_MS
  )

  const deletedVerifications = await prismaClient.verification.deleteMany({
    where: {
      expiresAt: { lt: verificationCutoff }
    }
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

  process.exit(0)
}

void task()
