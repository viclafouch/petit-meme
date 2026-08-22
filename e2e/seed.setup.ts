/* oxlint-disable no-console */
import { hashPassword } from 'better-auth/crypto'
import { test as setup } from '@playwright/test'
import { DATABASE_POOL_MAX_CONNECTIONS, prismaClient } from '~/db'
import { BUNNY_STATUS } from '~/constants/bunny'
import { MEME_ALGOLIA_INCLUDE, TRENDING_CATEGORY_DAYS } from '~/constants/meme'
import { DAY, THIRTY_DAYS_MS } from '~/constants/time'
import { MemeStatus, UserLocale } from '~/db/generated/prisma/enums'
import {
  replaceAllIndicesWithMemes,
  resolveAlgoliaIndexName
} from '~/lib/algolia'
import { stripeClient } from '~/lib/stripe'
import { logEnvironmentInfo } from '../scripts/lib/env-guard'
import { clearDatabase } from './clear-database'
import { E2E_PASSWORD, E2E_ROLES, type E2eRole } from './constants'
import {
  E2E_CATEGORIES,
  E2E_MEMES,
  E2E_VIDEO_DURATION,
  type E2eCategory,
  type E2eMeme
} from './content'

// Wider than a test's thirty seconds on purpose: this one empties a database,
// writes fifty three Memes and waits for Algolia to swap two indices.
const SEED_TIMEOUT_MS = 180_000

// Each write below nests its relations, so Prisma runs it in a transaction that
// holds a connection for its whole duration. Asking for all fifty three at once
// leaves forty eight of them queued on a pool of five, and that wait breaks the
// five second acquisition timeout as soon as the runner sits further from the
// database than a laptop does. Writing them by the poolful never queues.
const createWithinPool = async <T>(
  items: readonly T[],
  create: (item: T) => Promise<void>
) => {
  for (
    let index = 0;
    index < items.length;
    index += DATABASE_POOL_MAX_CONNECTIONS
  ) {
    const batch = items.slice(index, index + DATABASE_POOL_MAX_CONNECTIONS)

    // oxlint-disable-next-line no-await-in-loop -- waiting is the point here, the parallel form the rule asks for is the bug
    await Promise.all(batch.map(create))
  }
}

const BOOKMARK_DATE_OUTSIDE_TRENDING_WINDOW = new Date(
  Date.now() - (TRENDING_CATEGORY_DAYS + 1) * DAY
)

// A billing portal session is created against a real Stripe customer, so the
// role that opens one is born with a test mode customer rather than with an id
// that designates nothing.
const createStripeCustomer = async (role: E2eRole) => {
  if (!role.hasStripeCustomer) {
    return null
  }

  const { id } = await stripeClient.customers.create({
    email: role.email,
    name: role.name
  })

  return id
}

const createSubscription = async (
  role: E2eRole,
  stripeCustomerId: string | null
) => {
  if (!role.premiumPlan) {
    return
  }

  const now = new Date()

  await prismaClient.subscription.create({
    data: {
      id: `${role.id}-subscription`,
      plan: role.premiumPlan,
      referenceId: role.id,
      stripeCustomerId,
      status: 'active',
      billingInterval: 'month',
      periodStart: now,
      periodEnd: new Date(now.getTime() + THIRTY_DAYS_MS)
    }
  })
}

const createBookmarks = async (role: E2eRole) => {
  if (!role.bookmarkedMemeIds) {
    return
  }

  await prismaClient.userBookmark.createMany({
    data: role.bookmarkedMemeIds.map((memeId) => {
      return {
        userId: role.id,
        memeId,
        createdAt: BOOKMARK_DATE_OUTSIDE_TRENDING_WINDOW
      }
    })
  })
}

const createAiSearchLogs = async (role: E2eRole) => {
  if (!role.aiSearchCount) {
    return
  }

  await prismaClient.aiSearchLog.createMany({
    data: Array.from({ length: role.aiSearchCount }, (_, index) => {
      return {
        userId: role.id,
        prompt: `e2e seeded ai search ${index + 1}`,
        keywords: [],
        memeIds: [],
        locale: UserLocale.fr,
        resultCount: 0
      }
    })
  })
}

const createUser = async (role: E2eRole) => {
  const now = new Date()
  const stripeCustomerId = await createStripeCustomer(role)

  await prismaClient.user.create({
    data: {
      id: role.id,
      name: role.name,
      email: role.email,
      emailVerified: role.emailVerified,
      providerAvatar: role.providerAvatar,
      stripeCustomerId,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      accounts: {
        create: {
          id: `${role.id}-account`,
          accountId: role.id,
          providerId: 'credential',
          password: await hashPassword(E2E_PASSWORD),
          createdAt: now,
          updatedAt: now
        }
      }
    }
  })

  await createSubscription(role, stripeCustomerId)
}

const createCategory = async (category: E2eCategory) => {
  await prismaClient.category.create({
    data: {
      id: category.id,
      slug: category.slug,
      title: category.title,
      keywords: [...category.keywords],
      translations: {
        create: category.translations.map((translation) => {
          return {
            locale: translation.locale,
            title: translation.title,
            keywords: [...translation.keywords]
          }
        })
      }
    }
  })
}

const createMeme = async (meme: E2eMeme) => {
  // Publication stands in for creation. Left to its default, `createdAt` would
  // be the instant of a parallel insert, which gives the index sorted on it no
  // stable order to speak of.
  const publishedAt = new Date(Date.now() - meme.publishedDaysAgo * DAY)

  await prismaClient.meme.create({
    data: {
      id: meme.id,
      title: meme.title,
      description: meme.description,
      keywords: [...meme.keywords],
      contentLocale: meme.contentLocale,
      status: MemeStatus.PUBLISHED,
      viewCount: meme.viewCount,
      createdAt: publishedAt,
      publishedAt,
      video: {
        create: {
          bunnyId: meme.bunnyId,
          duration: E2E_VIDEO_DURATION,
          bunnyStatus: BUNNY_STATUS.RESOLUTION_FINISHED
        }
      },
      translations: {
        create: meme.translations.map((translation) => {
          return {
            locale: translation.locale,
            title: translation.title,
            description: translation.description,
            keywords: [...translation.keywords]
          }
        })
      },
      categories: {
        create: meme.categorySlugs.map((slug) => {
          return { category: { connect: { slug } } }
        })
      }
    }
  })
}

// The library reads Algolia for everything but the first trending page, so a
// Meme that stays in the database alone is invisible to most of the suite.
const indexMemes = async () => {
  const memes = await prismaClient.meme.findMany({
    include: MEME_ALGOLIA_INCLUDE
  })

  const results = await replaceAllIndicesWithMemes(memes)

  for (const { locale, count } of results) {
    console.log(`  ${resolveAlgoliaIndexName(locale)}: ${count} records`)
  }
}

setup.afterAll(async () => {
  await prismaClient.$disconnect()
})

// Nothing is deleted at Stripe. A deleted customer leaves an id that outlives
// it, and better-auth then hands that id to Stripe, which refuses it. Test mode
// customers pile up instead, which costs nothing and breaks nothing.
setup('seed the e2e environment', async () => {
  setup.setTimeout(SEED_TIMEOUT_MS)
  logEnvironmentInfo()

  await clearDatabase()

  await createWithinPool(Object.values(E2E_ROLES), createUser)
  console.log(`  ${Object.keys(E2E_ROLES).length} users created`)

  await createWithinPool(Object.values(E2E_CATEGORIES), createCategory)
  console.log(`  ${Object.keys(E2E_CATEGORIES).length} categories created`)

  await createWithinPool(E2E_MEMES, createMeme)
  console.log(`  ${E2E_MEMES.length} memes created`)

  await createWithinPool(Object.values(E2E_ROLES), createBookmarks)
  console.log(`  ${await prismaClient.userBookmark.count()} bookmarks created`)

  await createWithinPool(Object.values(E2E_ROLES), createAiSearchLogs)
  console.log(
    `  ${await prismaClient.aiSearchLog.count()} ai search logs created`
  )

  await indexMemes()
})
