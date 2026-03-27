/* oxlint-disable no-console */
import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'
import { prismaClient } from '~/db'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { clientEnv } from '~/env/client'
import {
  algoliaAdminClient,
  resolveAlgoliaIndexName,
  syncMemeToAllIndices
} from '~/lib/algolia'
import {
  createVideo,
  deleteVideo,
  getBunnyHeaders,
  uploadVideo
} from '~/lib/bunny'
import { getTweetByUrl, getTweetMedia } from '~/lib/react-tweet'
import { stripeClient } from '~/lib/stripe'
import { fetchWithZod } from '~/lib/utils'
import { locales } from '~/paraglide/runtime'
import { logEnvironmentInfo } from '../scripts/lib/env-guard'
import mocks from './seed-mock.json' with { type: 'json' }

const createMemeFromTwitterUrl = async (tweetUrl: string, title: string) => {
  const tweet = await getTweetByUrl(tweetUrl)
  const media = await getTweetMedia(tweet.video.url, tweet.poster.url)

  const buffer = Buffer.from(await media.video.blob.arrayBuffer())

  const { videoId } = await createVideo(title)

  const meme = await prismaClient.meme.create({
    data: {
      title,
      tweetUrl: tweet.url,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      video: {
        create: {
          duration: 0,
          bunnyStatus: 4,
          bunnyId: videoId
        }
      },
      translations: {
        create: {
          locale: 'fr',
          title,
          description: '',
          keywords: []
        }
      }
    },
    include: MEME_ALGOLIA_INCLUDE
  })

  await syncMemeToAllIndices(meme).catch((error) => {
    console.error(error)
  })

  await uploadVideo(videoId, buffer)
}

const clearDatabase = async () => {
  console.log('Clearing all database tables...')
  await prismaClient.memeActionDaily.deleteMany()
  await prismaClient.memeViewDaily.deleteMany()
  await prismaClient.studioGeneration.deleteMany()
  await prismaClient.adminAuditLog.deleteMany()
  await prismaClient.userBookmark.deleteMany()
  await prismaClient.memeCategory.deleteMany()
  await prismaClient.meme.deleteMany()
  await prismaClient.video.deleteMany()
  await prismaClient.subscription.deleteMany()
  await prismaClient.category.deleteMany()
  await prismaClient.rateLimit.deleteMany()
  await prismaClient.session.deleteMany()
  await prismaClient.account.deleteMany()
  await prismaClient.verification.deleteMany()
  await prismaClient.user.deleteMany()
  console.log('  Database cleared')
}

const clearAlgolia = async () => {
  console.log('Clearing Algolia indices...')
  await Promise.all(
    locales.map((locale) => {
      return algoliaAdminClient.replaceAllObjects({
        indexName: resolveAlgoliaIndexName(locale),
        objects: []
      })
    })
  )
  console.log('  Algolia cleared')
}

const clearStripe = async () => {
  console.log('Clearing Stripe test customers...')
  const customers = await stripeClient.customers.list()

  for (const customer of customers.data) {
    // oxlint-disable-next-line no-await-in-loop -- sequential deletion required by Stripe API
    await stripeClient.customers.del(customer.id)
  }

  console.log(`  ${customers.data.length} customers deleted`)
}

const clearBunny = async () => {
  console.log('Clearing Bunny CDN videos...')
  const { items } = await fetchWithZod(
    z.object({ items: z.array(z.object({ guid: z.string() })) }),
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'GET',
      headers: getBunnyHeaders()
    }
  )

  for (const bunnyVideo of items) {
    // oxlint-disable-next-line no-await-in-loop -- sequential deletion required by Bunny API
    await deleteVideo(bunnyVideo.guid)
  }

  console.log(`  ${items.length} videos deleted`)
}

const seed = async () => {
  logEnvironmentInfo()

  await new Promise((resolve) => {
    // oxlint-disable-next-line no-promise-executor-return
    return setTimeout(resolve, 5000)
  })

  await clearDatabase()
  await clearAlgolia()
  await clearStripe()
  await clearBunny()

  console.log(`Creating ${mocks.categories.length} categories...`)

  for (const category of mocks.categories) {
    // oxlint-disable-next-line no-await-in-loop -- sequential creation to preserve ordering
    await prismaClient.category.create({
      data: category
    })
  }

  console.log(`Creating and uploading ${mocks.memes.length} memes...`)

  for (const meme of mocks.memes) {
    // oxlint-disable-next-line no-await-in-loop -- sequential upload to avoid rate limiting
    await createMemeFromTwitterUrl(meme.tweetUrl, meme.title)
  }

  const adminEmail = 'admin@petit-meme.dev'
  const adminPassword = 'admin1234'

  console.log('Creating admin user...')
  const hashedPassword = await hashPassword(adminPassword)
  const now = new Date()
  const adminId = 'seed-admin-user'

  await prismaClient.user.create({
    data: {
      id: adminId,
      name: 'Admin',
      email: adminEmail,
      emailVerified: true,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now
    }
  })

  await prismaClient.account.create({
    data: {
      id: 'seed-admin-account',
      accountId: adminId,
      providerId: 'credential',
      userId: adminId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    }
  })

  console.log(`\nSeed complete`)
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`)
  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
