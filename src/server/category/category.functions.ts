import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { localizeCategory } from '~/helpers/i18n-content'
import { locales } from '~/paraglide/runtime'
import { readCachedCategories } from '~/server/category/category.server'

const CATEGORY_LIST_SCHEMA = z.object({
  locale: z.enum(locales)
})

export const listCategories = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return CATEGORY_LIST_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const categories = await readCachedCategories()

    return categories.map((category) => {
      return localizeCategory(category, data.locale)
    })
  })
