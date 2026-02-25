import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type {
  Header,
  RowData,
  SortDirection,
  Table as TableType
} from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'

const PAGE_SIZE = 20

const SortIcon = ({ direction }: { direction: SortDirection | false }) => {
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

const SortableHeader = <TData extends RowData>({
  header
}: {
  header: Header<TData, unknown>
}) => {
  const canSort = header.column.getCanSort()

  if (!canSort) {
    return flexRender(header.column.columnDef.header, header.getContext())
  }

  const sortDirection = header.column.getIsSorted()

  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={header.column.getToggleSortingHandler()}
      aria-label={`Trier par ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}`}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIcon direction={sortDirection} />
    </button>
  )
}

const PaginationFooter = <TData extends RowData>({
  table
}: {
  table: TableType<TData>
}) => {
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()

  return (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={table.getAllColumns().length}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex gap-2">
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
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  )
}

export const AdminTable = <TData extends RowData>({
  table
}: {
  table: TableType<TData>
}) => {
  const hasPagination = table.getPageCount() > 0

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={
                        sortDirection ? SORT_ARIA_MAP[sortDirection] : undefined
                      }
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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

export { PAGE_SIZE }
