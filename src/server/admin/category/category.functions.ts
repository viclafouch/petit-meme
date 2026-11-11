import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { CATEGORY_FORM_SCHEMA } from '~/constants/category-form'
import { prismaClient } from '~/db/client.server'
import type { Category } from '~/db/generated/prisma/client'
import { adminLogger } from '~/lib/logger'
import { baseLocale, locales } from '~/paraglide/runtime'
import {
  logAuditAction,
  type AuditAction
} from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { invalidateCategoriesCache } from '~/server/category/category.server'

type CategoryFormTranslations = z.infer<
  typeof CATEGORY_FORM_SCHEMA
>['translations']

type RecordCategoryChangeParams = {
  action: AuditAction
  adminId: string
  category: Pick<Category, 'id' | 'title' | 'slug'>
}

const UPDATE_CATEGORY_SCHEMA = CATEGORY_FORM_SCHEMA.extend({ id: z.string() })

const buildCategoryTranslations = (translations: CategoryFormTranslations) => {
  return locales.map((locale) => {
    return {
      locale,
      title: translations[locale].title,
      keywords: translations[locale].keywords
    }
  })
}

const recordCategoryChange = ({
  action,
  adminId,
  category
}: RecordCategoryChangeParams) => {
  invalidateCategoriesCache()

  void logAuditAction({
    action,
    actingAdminId: adminId,
    targetId: category.id,
    targetType: 'category',
    metadata: { title: category.title, slug: category.slug }
  })

  adminLogger.info(
    { categoryId: category.id, slug: category.slug, action },
    'Category changed'
  )
}

export const createCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
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
          create: buildCategoryTranslations(data.translations)
        }
      }
    })

    recordCategoryChange({
      action: 'create',
      adminId: context.user.id,
      category
    })

    return category
  })

export const updateCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
    return UPDATE_CATEGORY_SCHEMA.parse(data)
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
          upsert: buildCategoryTranslations(translations).map((translation) => {
            return {
              where: {
                categoryId_locale: {
                  categoryId: id,
                  locale: translation.locale
                }
              },
              update: {
                title: translation.title,
                keywords: translation.keywords
              },
              create: translation
            }
          })
        }
      }
    })

    recordCategoryChange({
      action: 'edit',
      adminId: context.user.id,
      category
    })

    return category
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: categoryId, context }) => {
    const category = await prismaClient.category.delete({
      where: { id: categoryId }
    })

    recordCategoryChange({
      action: 'delete',
      adminId: context.user.id,
      category
    })

    return category
  })
