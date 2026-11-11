import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'
import { type APIRequestContext, expect, test as setup } from '@playwright/test'
import { BUNNY_STATUS, type MemeDerivedFormat } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { TRENDING_CATEGORY_DAYS } from '~/constants/meme'
import { DAY, THIRTY_DAYS_MS } from '~/constants/time'
import { DATABASE_POOL_MAX_CONNECTIONS, prismaClient } from '~/db/client.server'
import { MemeStatus, UserLocale } from '~/db/generated/prisma/enums'
import { findMissingMemeFiles } from '~/server/meme/meme-file.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { clearDatabase } from './clear-database'
import { E2E_PASSWORD, E2E_ROLES, type E2eRole } from './constants'
import {
  E2E_CATEGORIES,
  E2E_MEMES,
  E2E_VIDEO_DURATION,
  type E2eCategory,
  type E2eMeme
} from './content'
import { E2E_CRON_SECRET, E2E_VIDEO_BUNNY_ID } from './env'

const SEED_TIMEOUT_MS = 180_000

const MEME_FILE_BACKFILL_COMMANDS = {
  mp4: 'pnpm exec vite-node --mode e2e scripts/watermark-videos.ts',
  mp3: 'pnpm exec vite-node --mode e2e scripts/backfill-mp3.ts'
} as const satisfies Record<MemeDerivedFormat, string>

const createWithinPool = async <TItem>(
  items: readonly TItem[],
  create: (item: TItem) => Promise<void>
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

const createStripeCustomer = async (role: E2eRole) => {
  if (!role.hasStripeCustomer) {
    return null
  }

  const { id } = await getStripeClient().customers.create({
    email: role.email,
    name: role.name
  })

  return id
}

const createSubscription = async (
  role: E2eRole,
  stripeCustomerId: string | null
) => {
  if (!role.subscription) {
    return
  }

  const now = new Date()

  await prismaClient.subscription.create({
    data: {
      id: `${role.id}-subscription`,
      plan: role.subscription.plan,
      referenceId: role.id,
      stripeCustomerId,
      status: 'active',
      billingInterval: role.subscription.billingInterval,
      periodStart: now,
      periodEnd: new Date(now.getTime() + THIRTY_DAYS_MS)
    }
  })
}

const createBookmarks = async (role: E2eRole) => {
  if (!role.bookmarkedMemeIds) {
    return
  }

  await prismaClient.bookmark.createMany({
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
  if (role.aiSearchCount === undefined || role.aiSearchCount === 0) {
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
      generationCount: role.generationCount,
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

const SYNC_ALGOLIA_RESPONSE_SCHEMA = z.object({ totalMemes: z.number() })

const syncAlgolia = async (request: APIRequestContext) => {
  const response = await request.get('/api/cron/sync-algolia', {
    headers: { authorization: `Bearer ${E2E_CRON_SECRET}` }
  })

  expect(response.status()).toBe(HTTP_STATUS.OK)

  return SYNC_ALGOLIA_RESPONSE_SCHEMA.parse(await response.json())
}

setup.describe('the e2e environment', () => {
  setup.afterAll(async () => {
    await prismaClient.$disconnect()
  })

  setup('is seeded', async ({ request }) => {
    setup.setTimeout(SEED_TIMEOUT_MS)

    await clearDatabase()

    await createWithinPool(Object.values(E2E_ROLES), createUser)
    await createWithinPool(Object.values(E2E_CATEGORIES), createCategory)
    await createWithinPool(E2E_MEMES, createMeme)
    await createWithinPool(Object.values(E2E_ROLES), createBookmarks)
    await createWithinPool(Object.values(E2E_ROLES), createAiSearchLogs)

    const { totalMemes } = await syncAlgolia(request)

    expect(totalMemes).toBe(E2E_MEMES.length)
  })

  setup('holds every file of its playable Meme', async () => {
    const missingFormats = await findMissingMemeFiles(E2E_VIDEO_BUNNY_ID)
    const backfillCommands = missingFormats.map((format) => {
      return MEME_FILE_BACKFILL_COMMANDS[format]
    })

    expect(
      missingFormats,
      `Bunny Storage misses files of the e2e Meme, run: ${backfillCommands.join(' && ')}`
    ).toStrictEqual([])
  })
})
