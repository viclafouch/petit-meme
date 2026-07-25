/* oxlint-disable no-console */
import { parseArgs } from 'node:util'
import { prismaClient } from '~/db'
import { AVATAR_CATALOG, AVATAR_DIRECTORY } from '~/constants/avatar'
import { Prisma } from '~/db/generated/prisma/client'
import { getAvatarSlotIdForEmail, resolveAvatarPath } from '~/helpers/avatar'
import { logEnvironmentInfo } from './lib/env-guard'

const ARCHIVABLE_ROWS_CONDITION = Prisma.sql`
  "provider_avatar" IS NULL
  AND "is_anonymized" = false
  AND "image" IS NOT NULL
  AND "image" NOT LIKE ${`${AVATAR_DIRECTORY}/%`}`

const archiveProviderAvatars = async (isDryRun: boolean) => {
  if (isDryRun) {
    const [{ count }] = await prismaClient.$queryRaw<[{ count: number }]>`
      SELECT count(*)::int AS "count"
      FROM "user"
      WHERE ${ARCHIVABLE_ROWS_CONDITION}`

    return count
  }

  return prismaClient.$executeRaw`
    UPDATE "user"
    SET "provider_avatar" = "image"
    WHERE ${ARCHIVABLE_ROWS_CONDITION}`
}

const assignMissingAvatars = async (isDryRun: boolean) => {
  const users = await prismaClient.user.findMany({
    where: { image: null, isAnonymized: false },
    select: { id: true, email: true }
  })

  const usersBySlotId = Object.groupBy(users, ({ email }) => {
    return getAvatarSlotIdForEmail(email)
  })

  const slotAssignments = AVATAR_CATALOG.map(({ id: slotId }) => {
    const userIds = (usersBySlotId[slotId] ?? []).map(({ id }) => {
      return id
    })

    return { slotId, userIds }
  }).filter(({ userIds }) => {
    return userIds.length > 0
  })

  if (!isDryRun) {
    await prismaClient.$transaction(
      slotAssignments.map(({ slotId, userIds }) => {
        return prismaClient.user.updateMany({
          where: { id: { in: userIds } },
          data: { image: resolveAvatarPath(slotId) }
        })
      })
    )
  }

  return { assignedCount: users.length, slotAssignments }
}

const backfillProviderAvatars = async () => {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false } }
  })

  const isDryRun = values['dry-run']

  logEnvironmentInfo()

  if (isDryRun) {
    console.log('Mode simulation : aucune écriture.\n')
  }

  const archivedCount = await archiveProviderAvatars(isDryRun)
  const { assignedCount, slotAssignments } =
    await assignMissingAvatars(isDryRun)

  console.log(`ProviderAvatars archivés : ${archivedCount}`)
  console.log(`AvatarSlots attribués : ${assignedCount}`)

  for (const { slotId, userIds } of slotAssignments) {
    console.log(`  ${slotId} : ${userIds.length}`)
  }

  process.exit(0)
}

void backfillProviderAvatars()
