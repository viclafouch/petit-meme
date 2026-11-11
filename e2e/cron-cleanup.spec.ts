import { randomUUID } from 'node:crypto'
import { type APIRequestContext, expect } from '@playwright/test'
import {
  type AuthProviderId,
  INACTIVITY_ANONYMIZATION_YEARS,
  UNVERIFIED_RETENTION_DAYS
} from '~/constants/auth'
import { BUNNY_STATUS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { DAY, DAYS_PER_WEEK, DAYS_PER_YEAR } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Meme, User } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { E2E_EMAIL_DOMAIN } from './constants'
import { E2E_CRON_SECRET } from './env'
import { test } from './fixtures'

const daysAgo = (days: number) => {
  return new Date(Date.now() - days * DAY)
}

const PAST_UNVERIFIED_RETENTION = daysAgo(UNVERIFIED_RETENTION_DAYS + 1)
const PAST_ANONYMIZATION_CUTOFF = daysAgo(
  INACTIVITY_ANONYMIZATION_YEARS * DAYS_PER_YEAR + 1
)
const LAST_WEEK = daysAgo(DAYS_PER_WEEK)
const LAST_YEAR = daysAgo(DAYS_PER_YEAR)
const PRUNED_VIEW_COUNT = 20

type CreateCronUserParams = Pick<User, 'emailVerified' | 'createdAt'> &
  Partial<Pick<User, 'lastActiveAt' | 'stripeCustomerId'>> & {
    providerId: AuthProviderId
  }

const createCronUser = async ({
  providerId,
  createdAt,
  ...user
}: CreateCronUserParams) => {
  const id = `e2e-cron-${randomUUID()}`

  await prismaClient.user.create({
    data: {
      id,
      name: 'E2E Cron',
      email: `${id}@${E2E_EMAIL_DOMAIN}`,
      createdAt,
      updatedAt: createdAt,
      ...user,
      accounts: {
        create: {
          id: `${id}-account`,
          accountId: id,
          providerId,
          createdAt,
          updatedAt: createdAt
        }
      }
    }
  })

  return id
}

const runCleanupCron = async (request: APIRequestContext) => {
  const response = await request.get('/api/cron/cleanup', {
    headers: { authorization: `Bearer ${E2E_CRON_SECRET}` }
  })

  expect(response.status()).toBe(HTTP_STATUS.OK)
}

const createMemeWithPrunedViews = async () => {
  const id = `e2e-cron-${randomUUID()}`

  await prismaClient.meme.create({
    data: {
      id,
      title: 'E2E Cron',
      status: MemeStatus.PENDING,
      video: {
        create: {
          bunnyId: id,
          duration: 1,
          bunnyStatus: BUNNY_STATUS.RESOLUTION_FINISHED
        }
      },
      viewsDaily: {
        create: Array.from({ length: PRUNED_VIEW_COUNT }, (_, index) => {
          return { viewerKey: `${id}-viewer-${index}`, day: LAST_YEAR }
        })
      }
    }
  })

  return id
}

const findMemeViews = (id: Meme['id']) => {
  return prismaClient.meme.findUnique({
    where: { id },
    select: { viewCount: true, _count: { select: { viewsDaily: true } } }
  })
}

const findUser = (id: User['id']) => {
  return prismaClient.user.findUnique({
    where: { id },
    select: { email: true, isAnonymized: true, lastActiveAt: true }
  })
}

test.describe('the cleanup cron', () => {
  test('removes an abandoned sign up along with its Stripe customer', async ({
    request
  }) => {
    const stripeCustomer = await getStripeClient().customers.create({
      email: `e2e-cron-abandoned@${E2E_EMAIL_DOMAIN}`
    })
    const userId = await createCronUser({
      providerId: 'credential',
      emailVerified: false,
      createdAt: PAST_UNVERIFIED_RETENTION,
      stripeCustomerId: stripeCustomer.id
    })

    await runCleanupCron(request)

    expect(await findUser(userId)).toBeNull()
    expect(
      await getStripeClient().customers.retrieve(stripeCustomer.id)
    ).toMatchObject({ deleted: true })
  })

  test('keeps a Twitter User whose email is unverified', async ({
    request
  }) => {
    const userId = await createCronUser({
      providerId: 'twitter',
      emailVerified: false,
      createdAt: PAST_UNVERIFIED_RETENTION
    })

    await runCleanupCron(request)

    expect(await findUser(userId)).not.toBeNull()
  })

  test('keeps an unverified sign up active last week', async ({ request }) => {
    const userId = await createCronUser({
      providerId: 'credential',
      emailVerified: false,
      createdAt: PAST_UNVERIFIED_RETENTION,
      lastActiveAt: LAST_WEEK
    })

    await runCleanupCron(request)

    expect(await findUser(userId)).not.toBeNull()
  })

  test('leaves an old account active last week as it is', async ({
    request
  }) => {
    const userId = await createCronUser({
      providerId: 'credential',
      emailVerified: true,
      createdAt: PAST_ANONYMIZATION_CUTOFF,
      lastActiveAt: LAST_WEEK
    })

    await runCleanupCron(request)

    expect(await findUser(userId)).toMatchObject({
      email: `${userId}@${E2E_EMAIL_DOMAIN}`,
      isAnonymized: false
    })
  })

  test('anonymizes an account inactive for three years and keeps it', async ({
    request
  }) => {
    const userId = await createCronUser({
      providerId: 'credential',
      emailVerified: true,
      createdAt: PAST_ANONYMIZATION_CUTOFF,
      lastActiveAt: PAST_ANONYMIZATION_CUTOFF
    })

    await runCleanupCron(request)

    expect(await findUser(userId)).toMatchObject({
      isAnonymized: true,
      lastActiveAt: null
    })
  })

  test('counts old views once when the same run arrives twice at once', async ({
    request
  }) => {
    const memeId = await createMemeWithPrunedViews()

    await Promise.all([runCleanupCron(request), runCleanupCron(request)])

    expect(await findMemeViews(memeId)).toStrictEqual({
      viewCount: PRUNED_VIEW_COUNT,
      _count: { viewsDaily: 0 }
    })
  })
})
