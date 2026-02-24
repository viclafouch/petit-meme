import { z } from 'zod'
import { prismaClient } from '@/db'
import { adminLogger } from '@/lib/logger'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'

export const CATEGORY_FORM_SCHEMA = z.object({
  title: z.string().min(3).max(100),
  slug: z.string().min(2).max(60),
  keywords: z.array(z.string().max(50)).max(20)
})

export const getCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    return prismaClient.category.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
)

export const addCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return CATEGORY_FORM_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const category = await prismaClient.category.create({ data })

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
  .handler(async ({ data }) => {
    const category = await prismaClient.category.update({
      where: {
        id: data.id
      },
      data
    })

    adminLogger.info(
      { categoryId: category.id, slug: data.slug },
      'Category edited'
    )

    return category
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: categoryId }) => {
    const category = await prismaClient.category.delete({
      where: {
        id: categoryId
      }
    })

    adminLogger.info({ categoryId }, 'Category deleted')

    return category
  })
