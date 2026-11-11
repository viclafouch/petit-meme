import { createServerOnlyFn } from '@tanstack/react-start'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'

const CATEGORIES_CACHE_TTL_MS = DAY

const CATEGORY_LIST_INCLUDE = {
  translations: true,
  _count: {
    select: {
      memes: {
        where: { meme: { status: MemeStatus.PUBLISHED } }
      }
    }
  }
} as const satisfies Prisma.CategoryInclude

const findCategories = () => {
  return prismaClient.category.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: CATEGORY_LIST_INCLUDE
  })
}

export type CategoryListItem = Awaited<
  ReturnType<typeof findCategories>
>[number]

type CategoriesCacheEntry = {
  categories: CategoryListItem[]
  expiresAt: number
}

let categoriesCache: CategoriesCacheEntry | null = null

export const readCachedCategories = createServerOnlyFn(async () => {
  if (categoriesCache && categoriesCache.expiresAt > Date.now()) {
    return categoriesCache.categories
  }

  const categories = await findCategories()

  categoriesCache = {
    categories,
    expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS
  }

  return categories
})

export const invalidateCategoriesCache = createServerOnlyFn(() => {
  categoriesCache = null
})
