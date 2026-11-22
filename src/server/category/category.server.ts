import { createServerOnlyFn } from '@tanstack/react-start'
import { DAY, HOUR } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { VISIBLE_CONTENT_LOCALES } from '~/helpers/i18n-content'
import type { Locale } from '~/paraglide/runtime'

const CATEGORIES_CACHE_TTL_MS = DAY
const CATEGORY_COUNTS_CACHE_TTL_MS = HOUR

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
  categoryCountsCache.clear()
})

type CategoryMemeCounts = {
  byCategory: Map<string, number>
  total: number
}

type CategoryCountsCacheEntry = {
  counts: CategoryMemeCounts
  expiresAt: number
}

const categoryCountsCache = new Map<Locale, CategoryCountsCacheEntry>()

const findPublishedMemeCounts = async (
  locale: Locale
): Promise<CategoryMemeCounts> => {
  const visibleMemeWhere = {
    status: MemeStatus.PUBLISHED,
    contentLocale: { in: VISIBLE_CONTENT_LOCALES[locale] }
  }
  const [groups, total] = await Promise.all([
    prismaClient.memeCategory.groupBy({
      by: ['categoryId'],
      where: { meme: visibleMemeWhere },
      _count: { _all: true }
    }),
    prismaClient.meme.count({ where: visibleMemeWhere })
  ])

  return {
    byCategory: new Map(
      groups.map((group) => {
        return [group.categoryId, group._count._all]
      })
    ),
    total
  }
}

export const readCachedCategoryMemeCounts = createServerOnlyFn(
  async (locale: Locale) => {
    const cached = categoryCountsCache.get(locale)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.counts
    }

    const counts = await findPublishedMemeCounts(locale)

    categoryCountsCache.set(locale, {
      counts,
      expiresAt: Date.now() + CATEGORY_COUNTS_CACHE_TTL_MS
    })

    return counts
  }
)
