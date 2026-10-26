import { createFileRoute } from '@tanstack/react-router'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { baseLocale } from '~/paraglide/runtime'
import { CategoriesPage } from '~/routes/admin/categories/-components/categories-page'

export const Route = createFileRoute('/admin/categories/')({
  component: CategoriesPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Catégories' }] }
  },
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getCategoriesListQueryOpts(baseLocale),
      staleTime: 'static'
    })

    return { crumb: 'Catégories' }
  }
})
