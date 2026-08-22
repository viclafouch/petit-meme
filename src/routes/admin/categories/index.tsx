import { Plus } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import { formatDate } from '~/helpers/date'
import { baseLocale, getLocale } from '~/paraglide/runtime'
import { AdminTable } from '~/routes/admin/-components/admin-table'
import { INITIAL_PAGINATION } from '~/routes/admin/-lib/constants'
import { createAppColumnHelper, useAppTable } from '~/routes/admin/-lib/table'
import { AddCategoryButton } from '~/routes/admin/categories/-components/add-category-button'
import { CategoryDropdown } from '~/routes/admin/categories/-components/category-dropdown'
import { type EnrichedCategory, getCategories } from '~/server/categories'

const columnHelper = createAppColumnHelper<EnrichedCategory>()

const columns = columnHelper.columns([
  columnHelper.accessor('title', {
    header: 'Titre'
  }),
  columnHelper.accessor('slug', {
    header: 'Slug',
    cell: (info) => {
      return (
        <span className="text-muted-foreground font-mono text-sm">
          /{info.getValue()}
        </span>
      )
    }
  }),
  columnHelper.accessor(
    (row) => {
      return row._count.memes
    },
    {
      id: 'publishedMemes',
      header: 'Memes publiés',
      cell: (info) => {
        const count = info.getValue()

        return count === 0 ? (
          <span className="text-muted-foreground tabular-nums">0</span>
        ) : (
          <span className="tabular-nums">{count}</span>
        )
      }
    }
  ),
  columnHelper.accessor('keywords', {
    header: 'Mots clés',
    enableSorting: false,
    cell: (info) => {
      return (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((keyword) => {
            return (
              <Badge variant="outline" key={keyword}>
                {keyword}
              </Badge>
            )
          })}
        </div>
      )
    }
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date de création',
    cell: (info) => {
      return formatDate(info.getValue(), getLocale())
    }
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => {
      return <CategoryDropdown category={info.row.original} />
    }
  })
])

const RouteComponent = () => {
  const { categories } = Route.useLoaderData()

  const table = useAppTable({
    data: categories,
    columns,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: INITIAL_PAGINATION
    }
  })

  return (
    <Container>
      <PageHeader
        title="Catégories"
        action={
          <AddCategoryButton>
            <Plus /> Ajouter une catégorie
          </AddCategoryButton>
        }
      />
      <div className="py-10">
        <AdminTable table={table} caption="Liste des catégories" />
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/categories/')({
  component: RouteComponent,
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
