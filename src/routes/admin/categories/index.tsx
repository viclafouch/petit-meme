import { formatDate } from 'date-fns'
import { Plus } from 'lucide-react'
import { AdminTable } from '@/components/admin/admin-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import type { Category } from '@/db/generated/prisma/client'
import { AddCategoryButton } from '@/routes/admin/categories/-components/add-category-button'
import { CategoryDropdown } from '@/routes/admin/categories/-components/category-dropdown'
import { getCategories } from '@/server/categories'
import { createFileRoute } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'

const columnHelper = createColumnHelper<Category>()

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('title', {
    header: 'Titre',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('slug', {
    header: 'Slug',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('keywords', {
    header: 'Mots clés',
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
    id: 'Actions',
    cell: (cell) => {
      return <CategoryDropdown category={cell.row.original} />
    }
  })
]

const RouteComponent = () => {
  const { categories } = Route.useLoaderData()

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: categories,
    columns,
    getRowId: (row) => {
      return row.id.toString()
    },
    getCoreRowModel: getCoreRowModel()
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
      <div className="w-full mx-auto py-10">
        <AdminTable table={table} />
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/categories/')({
  component: RouteComponent,
  loader: async () => {
    const categories = await getCategories()

    return {
      crumb: 'Catégories',
      categories
    }
  }
})
