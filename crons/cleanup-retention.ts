/* eslint-disable no-console */
import { prismaClient } from '@/db'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const VERIFICATION_GRACE_PERIOD_MS = MS_PER_DAY
const VIEW_RETENTION_DAYS = 90

const task = async () => {
  const now = new Date()

  const deletedSessions = await prismaClient.session.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  })

  console.log(`Deleted ${deletedSessions.count} expired sessions`)

  const verificationCutoff = new Date(
    now.getTime() - VERIFICATION_GRACE_PERIOD_MS
  )

  const deletedVerifications = await prismaClient.verification.deleteMany({
    where: {
      expiresAt: { lt: verificationCutoff }
    }
  })

  console.log(`Deleted ${deletedVerifications.count} expired verifications`)

  const viewCutoff = new Date(now.getTime() - VIEW_RETENTION_DAYS * MS_PER_DAY)

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

    console.log(
      `Aggregated ${viewCountsByMeme.length} memes, deleted ${deletedViews.count} old MemeViewDaily records`
    )
  } else {
    console.log('No old MemeViewDaily records to clean up')
  }

  console.log('Done')
  process.exit(0)
}

void task()
