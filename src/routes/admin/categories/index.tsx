import { createFileRoute } from '@tanstack/react-router'
import { baseLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'
import { CategoriesPage } from '~/routes/admin/categories/-components/categories-page'

export const Route = createFileRoute('/admin/categories/')({
  component: CategoriesPage,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...listCategoriesQueryOpts(baseLocale),
      staleTime: 'static'
    })

    return { crumb: 'Catégories' }
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Catégories' }] }
  }
})
