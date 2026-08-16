/* oxlint-disable no-console */
import { hashPassword } from 'better-auth/crypto'
import { test as setup } from '@playwright/test'
import { prismaClient } from '~/db'
import { BUNNY_STATUS } from '~/constants/bunny'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { DAY } from '~/constants/time'
import { MemeStatus } from '~/db/generated/prisma/enums'
import {
  replaceAllIndicesWithMemes,
  resolveAlgoliaIndexName
} from '~/lib/algolia'
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

const createUser = async (role: E2eRole) => {
  const now = new Date()

  await prismaClient.user.create({
    data: {
      id: role.id,
      name: role.name,
      email: role.email,
      emailVerified: role.emailVerified,
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

  await Promise.all(
    Object.values(E2E_ROLES).map((role) => {
      return createUser(role)
    })
  )
  console.log(`  ${Object.keys(E2E_ROLES).length} users created`)

  await Promise.all(
    Object.values(E2E_CATEGORIES).map((category) => {
      return createCategory(category)
    })
  )
  console.log(`  ${Object.keys(E2E_CATEGORIES).length} categories created`)

  await Promise.all(
    E2E_MEMES.map((meme) => {
      return createMeme(meme)
    })
  )
  console.log(`  ${E2E_MEMES.length} memes created`)

  await indexMemes()
})
