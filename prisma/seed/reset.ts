import { z } from 'zod'
import { prismaClient } from '~/db/client.server'
import { fetchWithZod } from '~/server/http/fetch.server'
import { deleteMemeFiles } from '~/server/meme/meme-file.server'
import {
  buildLibraryApiUrl,
  deleteVideo,
  getBunnyHeaders
} from '~/server/platforms/bunny.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { matchIsMissingStripeCustomer } from '~/server/subscription/stripe-customer.server'

const BUNNY_PAGE_SIZE = 1000

const clearDatabase = async () => {
  await prismaClient.adminAuditLog.deleteMany()
  await prismaClient.user.deleteMany()
  await prismaClient.meme.deleteMany()
  await prismaClient.video.deleteMany()
  await prismaClient.category.deleteMany()
  await prismaClient.subscription.deleteMany()
  await prismaClient.rateLimit.deleteMany()
  await prismaClient.verification.deleteMany()
  await prismaClient.recommendCache.deleteMany()
}

const deleteTargetStripeCustomers = async () => {
  const users = await prismaClient.user.findMany({
    where: { stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true }
  })

  for (const { stripeCustomerId } of users) {
    if (stripeCustomerId) {
      // oxlint-disable-next-line no-await-in-loop -- sequential deletion keeps under the Stripe rate limit
      await getStripeClient()
        .customers.del(stripeCustomerId)
        .catch((error: unknown) => {
          if (!matchIsMissingStripeCustomer(error)) {
            throw error
          }
        })
    }
  }

  return users.length
}

const BUNNY_VIDEOS_SCHEMA = z.object({
  items: z.array(z.object({ guid: z.string() }))
})

const clearBunny = async () => {
  const { items } = await fetchWithZod(
    BUNNY_VIDEOS_SCHEMA,
    buildLibraryApiUrl(`/videos?itemsPerPage=${BUNNY_PAGE_SIZE}`),
    { method: 'GET', headers: getBunnyHeaders() }
  )

  for (const { guid } of items) {
    // oxlint-disable-next-line no-await-in-loop -- sequential deletion keeps under the Bunny rate limit
    await deleteMemeFiles(guid)
    // oxlint-disable-next-line no-await-in-loop -- sequential deletion keeps under the Bunny rate limit
    await deleteVideo(guid)
  }

  return items.length
}

export const resetTarget = async () => {
  console.log(
    `  ${await deleteTargetStripeCustomers()} Stripe customers deleted`
  )
  await clearDatabase()
  console.log('  Database cleared')
  console.log(`  ${await clearBunny()} Bunny videos deleted`)
}
