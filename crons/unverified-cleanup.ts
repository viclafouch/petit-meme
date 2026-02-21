import { DAY } from '@/constants/time'
import { prismaClient } from '@/db'
import { cronLogger } from '@/lib/logger'

const log = cronLogger.child({ job: 'unverified-cleanup' })

const UNVERIFIED_RETENTION_DAYS = 30

const task = async () => {
  const cutoffDate = new Date(Date.now() - UNVERIFIED_RETENTION_DAYS * DAY)

  const unverifiedUsers = await prismaClient.user.findMany({
    where: {
      emailVerified: false,
      createdAt: { lt: cutoffDate },
      Meme: { none: {} },
      bookmarks: { none: {} }
    },
    select: { id: true, email: true }
  })

  if (unverifiedUsers.length === 0) {
    log.info('No unverified users to clean up')
    process.exit(0)
  }

  const userIds = unverifiedUsers.map((user) => {
    return user.id
  })

  const subscriptions = await prismaClient.subscription.findMany({
    where: { referenceId: { in: userIds } },
    select: { referenceId: true }
  })

  const subscribedUserIds = new Set(
    subscriptions.map((sub) => {
      return sub.referenceId
    })
  )

  const deletableUsers = unverifiedUsers.filter((user) => {
    return !subscribedUserIds.has(user.id)
  })

  if (deletableUsers.length === 0) {
    log.info('No unverified users without subscriptions to clean up')
    process.exit(0)
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

  log.info({ deletedCount, errorCount }, 'Completed')
  process.exit(errorCount > 0 ? 1 : 0)
}

void task()
