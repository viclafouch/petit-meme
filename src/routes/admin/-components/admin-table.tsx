import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type {
  Header,
  ReactTable,
  RowData,
  SortDirection
} from '@tanstack/react-table'
import { FlexRender } from '@tanstack/react-table'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import type { AdminTableFeatures } from '~/routes/admin/-lib/table'

type SortIconParams = {
  direction: SortDirection | false
}

const SortIcon = ({ direction }: SortIconParams) => {
  if (direction === 'asc') {
    return <ArrowUp className="size-4" aria-hidden />
  }

  if (direction === 'desc') {
    return <ArrowDown className="size-4" aria-hidden />
  }

  return <ArrowUpDown className="size-4 opacity-50" aria-hidden />
}

const SORT_ARIA_MAP = {
  asc: 'ascending',
  desc: 'descending'
} as const satisfies Record<SortDirection, string>

function getAriaSortValue<TData extends RowData>(
  header: Header<AdminTableFeatures, TData>
): 'ascending' | 'descending' | 'none' | undefined {
  const sortDirection = header.column.getIsSorted()

  if (sortDirection) {
    return SORT_ARIA_MAP[sortDirection]
  }

  return header.column.getCanSort() ? 'none' : undefined
}

type SortableHeaderParams<TData extends RowData> = {
  header: Header<AdminTableFeatures, TData>
}

const SortableHeader = <TData extends RowData>({
  header
}: SortableHeaderParams<TData>) => {
  const canSort = header.column.getCanSort()

  if (!canSort) {
    return <FlexRender header={header} />
  }

  const sortDirection = header.column.getIsSorted()

  return (
    <button
      type="button"
      className="flex min-h-11 items-center gap-1 py-2 hover:text-foreground transition-colors"
      onClick={header.column.getToggleSortingHandler()}
      aria-label={`Trier par ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}`}
    >
      <FlexRender header={header} />
      <SortIcon direction={sortDirection} />
    </button>
  )
}

type PaginationFooterParams<TData extends RowData> = {
  table: ReactTable<AdminTableFeatures, TData>
}

const PaginationFooter = <TData extends RowData>({
  table
}: PaginationFooterParams<TData>) => {
  const currentPage = table.state.pagination.pageIndex + 1
  const totalPages = table.getPageCount()

  return (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={table.getAllColumns().length}>
          <div className="flex items-center justify-between">
            <span
              className="text-sm text-muted-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              Page {currentPage} sur {totalPages}
            </span>
            <nav aria-label="Pagination de la table" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  table.previousPage()
                }}
                disabled={!table.getCanPreviousPage()}
                aria-label="Page précédente"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  table.nextPage()
                }}
                disabled={!table.getCanNextPage()}
                aria-label="Page suivante"
              >
                Suivant
              </Button>
            </nav>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  )
}

type AdminTableParams<TData extends RowData> = {
  table: ReactTable<AdminTableFeatures, TData>
  caption?: string
}

export const AdminTable = <TData extends RowData>({
  table,
  caption
}: AdminTableParams<TData>) => {
  const hasPagination = table.getPageCount() > 0

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <Table aria-label={caption}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={getAriaSortValue(header)}
                    >
                      {header.isPlaceholder ? null : (
                        <SortableHeader header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            )
          })}
        </TableHeader>
        <TableBody className="**:data-[slot=table-cell]:first:w-8">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => {
              return (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                Aucun résultat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {hasPagination ? <PaginationFooter table={table} /> : null}
      </Table>
    </div>
  )
}
