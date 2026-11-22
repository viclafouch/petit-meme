import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { localizeCategory } from '~/helpers/i18n-content'
import { locales } from '~/paraglide/runtime'
import {
  readCachedCategories,
  readCachedCategoryMemeCounts
} from '~/server/category/category.server'

const CATEGORY_LIST_SCHEMA = z.object({
  locale: z.enum(locales)
})

export const listCategories = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return CATEGORY_LIST_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const [categories, memeCounts] = await Promise.all([
      readCachedCategories(),
      readCachedCategoryMemeCounts(data.locale)
    ])

    return categories.map((category) => {
      return {
        ...localizeCategory(category, data.locale),
        memeCount: memeCounts.byCategory.get(category.id) ?? 0
      }
    })
  })

export const countLibraryMemes = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return CATEGORY_LIST_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const memeCounts = await readCachedCategoryMemeCounts(data.locale)

    return memeCounts.total
  })
