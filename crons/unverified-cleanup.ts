/* eslint-disable no-console */
import { prismaClient } from '@/db'
import { maskEmail } from '@/helpers/mask-email'

const UNVERIFIED_RETENTION_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

const task = async () => {
  const cutoffDate = new Date(
    Date.now() - UNVERIFIED_RETENTION_DAYS * MS_PER_DAY
  )

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
    console.log('No unverified users to clean up')
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
    console.log('No unverified users without subscriptions to clean up')
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
      console.log(`Deleted unverified user ${maskEmail(user.email)}`)
      deletedCount += 1
    } else {
      console.error(
        `Failed to delete user ${maskEmail(user.email)}:`,
        result.reason
      )
      errorCount += 1
    }
  }

  console.log(
    `Done: ${String(deletedCount)} deleted, ${String(errorCount)} errors`
  )
  process.exit(errorCount > 0 ? 1 : 0)
}

void task()
