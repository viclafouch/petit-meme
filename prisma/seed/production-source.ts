import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { z } from 'zod'
import { PrismaPg } from '@prisma/adapter-pg'
import { ORIGINAL_ACCESS_HEADER } from '~/constants/bunny'
import { FIVE_MINUTES_IN_SECONDS, SECOND } from '~/constants/time'
import { type Prisma, PrismaClient } from '~/db/generated/prisma/client'
import { serverEnv } from '~/env/server.server'
import { signVideoFileUrl } from '~/server/platforms/bunny-token.server'

const PRODUCTION_ENV_FILE = '.env.production'
const READ_TIMEOUT_MS = 60_000
const DOWNLOAD_TIMEOUT_MS = 60_000

const PRODUCTION_SOURCE_SCHEMA = z.object({
  DATABASE_URL: z.url(),
  VITE_BUNNY_HOSTNAME: z.string().min(1),
  BUNNY_TOKEN_AUTH_KEY: z.string().min(1),
  BUNNY_ORIGINAL_ACCESS_KEY: z.string().min(1)
})

export type ProductionSource = z.infer<typeof PRODUCTION_SOURCE_SCHEMA>

export const loadProductionSource = () => {
  return PRODUCTION_SOURCE_SCHEMA.parse(
    dotenv.parse(readFileSync(PRODUCTION_ENV_FILE))
  )
}

const getHost = (url: string) => {
  return new URL(url).hostname
}

export const assertSeedTargetIsNotProduction = (source: ProductionSource) => {
  const violations = [
    getHost(serverEnv.DATABASE_URL) === getHost(source.DATABASE_URL) &&
      'the target database is the production database',
    serverEnv.VITE_BUNNY_HOSTNAME === source.VITE_BUNNY_HOSTNAME &&
      'the target Bunny hostname is the production one',
    !serverEnv.STRIPE_SECRET_KEY.startsWith('sk_test_') &&
      'the target Stripe key is not a test key',
    !serverEnv.EMAIL_OVERRIDE_TO && 'the target sends emails to real recipients'
  ].filter(Boolean)

  if (violations.length > 0) {
    throw new Error(`Refusing to seed: ${violations.join(', ')}`)
  }
}

const PRODUCTION_MEME_SELECT = {
  id: true,
  title: true,
  description: true,
  keywords: true,
  contentLocale: true,
  tweetUrl: true,
  viewCount: true,
  shareCount: true,
  downloadCount: true,
  createdAt: true,
  publishedAt: true,
  video: { select: { bunnyId: true, duration: true } },
  translations: {
    select: { locale: true, title: true, description: true, keywords: true }
  },
  categories: { select: { category: { select: { slug: true } } } }
} as const satisfies Prisma.MemeSelect

export type ProductionMeme = Prisma.MemeGetPayload<{
  select: typeof PRODUCTION_MEME_SELECT
}>

const PRODUCTION_CATEGORY_SELECT = {
  title: true,
  slug: true,
  keywords: true,
  translations: { select: { locale: true, title: true, keywords: true } }
} as const satisfies Prisma.CategorySelect

export type ProductionCategory = Prisma.CategoryGetPayload<{
  select: typeof PRODUCTION_CATEGORY_SELECT
}>

export const readProductionLibrary = async (
  source: ProductionSource,
  memeIds: string[]
) => {
  const pool = new Pool({ connectionString: source.DATABASE_URL, max: 1 })
  const productionClient = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    return await productionClient.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SET TRANSACTION READ ONLY`

        const categories = await transaction.category.findMany({
          select: PRODUCTION_CATEGORY_SELECT,
          orderBy: { createdAt: 'asc' }
        })
        const memes = await transaction.meme.findMany({
          where: { id: { in: memeIds }, status: 'PUBLISHED' },
          select: PRODUCTION_MEME_SELECT
        })

        return { categories, memes }
      },
      { timeout: READ_TIMEOUT_MS }
    )
  } finally {
    await productionClient.$disconnect()
    await pool.end()
  }
}

export const downloadProductionOriginal = async (
  source: ProductionSource,
  bunnyId: string
) => {
  const url = await signVideoFileUrl({
    hostname: source.VITE_BUNNY_HOSTNAME,
    videoId: bunnyId,
    file: 'original',
    securityKey: source.BUNNY_TOKEN_AUTH_KEY,
    expiresAt: Math.floor(Date.now() / SECOND) + FIVE_MINUTES_IN_SECONDS
  })
  const response = await fetch(url, {
    headers: { [ORIGINAL_ACCESS_HEADER]: source.BUNNY_ORIGINAL_ACCESS_KEY },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Production original ${bunnyId}: HTTP ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}
