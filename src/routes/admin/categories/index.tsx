import { formatDate } from 'date-fns'
import { Plus } from 'lucide-react'
import { AdminTable, PAGE_SIZE } from '@/components/admin/admin-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import { AddCategoryButton } from '@/routes/admin/categories/-components/add-category-button'
import { CategoryDropdown } from '@/routes/admin/categories/-components/category-dropdown'
import { type EnrichedCategory, getCategories } from '@/server/categories'
import { createFileRoute } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

const columnHelper = createColumnHelper<EnrichedCategory>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Titre',
    cell: (info) => {
      return info.getValue()
    }
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
      return formatDate(info.getValue(), 'dd/MM/yyyy')
    }
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => {
      return <CategoryDropdown category={info.row.original} />
    }
  })
]

function getRowId(row: EnrichedCategory) {
  return row.id
}

const RouteComponent = () => {
  const { categories } = Route.useLoaderData()

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not compatible with React Compiler (https://github.com/TanStack/table/issues/5903)
  const table = useReactTable({
    data: categories,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: {
        pageSize: PAGE_SIZE
      }
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
      <div className="mx-auto py-10">
        <AdminTable table={table} />
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
    const categories = await getCategories()

    return {
      crumb: 'Catégories',
      categories
    }
  }
})
