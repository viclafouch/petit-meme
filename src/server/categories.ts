import { z } from 'zod'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import { CATEGORY_SLUG_REGEX } from '~/constants/meme'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import {
  buildLocaleRecord,
  resolveCategoryTranslation
} from '~/helpers/i18n-content'
import { adminLogger } from '~/lib/logger'
import { baseLocale, type Locale, locales } from '~/paraglide/runtime'
import { logAuditAction } from '~/server/audit'
import { adminRequiredMiddleware } from '~/server/user-auth'

export const CATEGORY_TRANSLATION_SCHEMA = z.object({
  title: z.string().min(3).max(100),
  keywords: z.array(z.string().max(50)).max(20)
})

export const CATEGORY_FORM_SCHEMA = z.object({
  slug: z.string().regex(CATEGORY_SLUG_REGEX),
  translations: z.object(
    buildLocaleRecord(() => {
      return CATEGORY_TRANSLATION_SCHEMA
    })
  )
})

type CategoryFormTranslations = z.infer<
  typeof CATEGORY_FORM_SCHEMA
>['translations']

function buildCategoryTranslationCreates(
  translations: CategoryFormTranslations
) {
  return locales.map((locale) => {
    return {
      locale,
      title: translations[locale].title,
      keywords: translations[locale].keywords
    }
  })
}

type BuildCategoryTranslationUpsertsParams = {
  categoryId: string
  translations: CategoryFormTranslations
}

function buildCategoryTranslationUpserts({
  categoryId,
  translations
}: BuildCategoryTranslationUpsertsParams) {
  return locales.map((locale) => {
    const data = translations[locale]

    return {
      where: { categoryId_locale: { categoryId, locale } },
      update: { title: data.title, keywords: data.keywords },
      create: { locale, title: data.title, keywords: data.keywords }
    }
  })
}

const CATEGORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const CATEGORIES_INCLUDE = {
  translations: true,
  _count: {
    select: {
      memes: {
        where: { meme: { status: MemeStatus.PUBLISHED } }
      }
    }
  }
} as const satisfies Prisma.CategoryInclude

const fetchCategories = async () => {
  return prismaClient.category.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: CATEGORIES_INCLUDE
  })
}

export type EnrichedCategory = Awaited<
  ReturnType<typeof fetchCategories>
>[number]

type CategoriesCacheEntry = {
  data: Awaited<ReturnType<typeof fetchCategories>>
  expiresAt: number
}

let categoriesCache: CategoriesCacheEntry | null = null

export const invalidateCategoriesCache = createServerOnlyFn(() => {
  categoriesCache = null
})

type ResolveCategoriesParams = {
  categories: Awaited<ReturnType<typeof fetchCategories>>
  locale: Locale
}

const resolveCategories = ({ categories, locale }: ResolveCategoriesParams) => {
  return categories.map((category) => {
    const resolved = resolveCategoryTranslation({
      translations: category.translations,
      requestedLocale: locale,
      fallback: category
    })

    return {
      ...category,
      title: resolved.title,
      keywords: resolved.keywords
    }
  })
}

const GET_CATEGORIES_INPUT = z.object({
  locale: z.enum(locales)
})

export const getCategories = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    return GET_CATEGORIES_INPUT.parse(data)
  })
  .handler(async ({ data }) => {
    const { locale } = data

    if (categoriesCache && categoriesCache.expiresAt > Date.now()) {
      return resolveCategories({ categories: categoriesCache.data, locale })
    }

    const fetched = await fetchCategories()

    categoriesCache = {
      data: fetched,
      expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS
    }

    return resolveCategories({ categories: fetched, locale })
  })

export const addCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return CATEGORY_FORM_SCHEMA.parse(data)
  })
  .handler(async ({ data, context }) => {
    const sourceTranslation = data.translations[baseLocale]

    const category = await prismaClient.category.create({
      data: {
        title: sourceTranslation.title,
        slug: data.slug,
        keywords: sourceTranslation.keywords,
        translations: {
          create: buildCategoryTranslationCreates(data.translations)
        }
      }
    })

    invalidateCategoriesCache()

    void logAuditAction({
      action: 'create',
      actingAdminId: context.user.id,
      targetId: category.id,
      targetType: 'category',
      metadata: { title: sourceTranslation.title, slug: data.slug }
    })

    adminLogger.info(
      { categoryId: category.id, slug: data.slug },
      'Category created'
    )

    return category
  })

export const editCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return CATEGORY_FORM_SCHEMA.extend({
      id: z.string()
    }).parse(data)
  })
  .handler(async ({ data, context }) => {
    const { id, slug, translations } = data
    const sourceTranslation = translations[baseLocale]

    const category = await prismaClient.category.update({
      where: { id },
      data: {
        title: sourceTranslation.title,
        slug,
        keywords: sourceTranslation.keywords,
        translations: {
          upsert: buildCategoryTranslationUpserts({
            categoryId: id,
            translations
          })
        }
      }
    })

    invalidateCategoriesCache()

    void logAuditAction({
      action: 'edit',
      actingAdminId: context.user.id,
      targetId: category.id,
      targetType: 'category',
      metadata: { title: sourceTranslation.title, slug }
    })

    adminLogger.info({ categoryId: category.id, slug }, 'Category edited')

    return category
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: categoryId, context }) => {
    const category = await prismaClient.category.delete({
      where: {
        id: categoryId
      }
    })

    invalidateCategoriesCache()

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: categoryId,
      targetType: 'category',
      metadata: { title: category.title, slug: category.slug }
    })

    adminLogger.info({ categoryId }, 'Category deleted')

    return category
  })
