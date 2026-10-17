import { createFileRoute } from '@tanstack/react-router'
import { baseLocale } from '~/paraglide/runtime'
import { CategoriesPage } from '~/routes/admin/categories/-components/categories-page'
import { getCategories } from '~/server/categories'

export const Route = createFileRoute('/admin/categories/')({
  component: CategoriesPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Catégories' }] }
  },
  loader: async () => {
    const categories = await getCategories({
      data: { locale: baseLocale }
    })

    return {
      crumb: 'Catégories',
      categories
    }
  }
})
