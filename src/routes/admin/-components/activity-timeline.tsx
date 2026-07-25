import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { LoadingSpinner } from '~/components/ui/spinner'
import { getErrorMessage } from '~/helpers/error'
import type { ActivityTimelineScope } from '~/routes/admin/-components/activity-columns'
import {
  ACTIVITY_COLUMNS,
  ACTIVITY_TIMELINE_SCOPES
} from '~/routes/admin/-components/activity-columns'
import {
  AdminTable,
  getRowId,
  PAGE_SIZE
} from '~/routes/admin/-components/admin-table'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'

const EMPTY_ROWS: AdminActivityRow[] = []

type ActivityTimelineParams = {
  rows: AdminActivityRow[] | undefined
  total: number
  page: number
  onPageChange: (page: number) => void
  caption: string
  scope: ActivityTimelineScope
  isPending: boolean
  isError: boolean
  error: Error | null
}

// oxlint-disable-next-line react/react-compiler -- useReactTable is flagged as incompatible library
export const ActivityTimeline = ({
  rows,
  total,
  page,
  onPageChange,
  caption,
  scope,
  isPending,
  isError,
  error
}: ActivityTimelineParams) => {
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const currentPagination = { pageIndex: page - 1, pageSize: PAGE_SIZE }
    const nextPagination =
      typeof updater === 'function' ? updater(currentPagination) : updater

    onPageChange(nextPagination.pageIndex + 1)
  }

  const table = useReactTable({
    data: rows ?? EMPTY_ROWS,
    columns: ACTIVITY_COLUMNS,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / PAGE_SIZE),
    state: {
      pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
      columnVisibility: ACTIVITY_TIMELINE_SCOPES[scope]
    },
    onPaginationChange: handlePaginationChange
  })

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {getErrorMessage(error)}
      </p>
    )
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-label={`Chargement — ${caption}`}
        className="py-10"
      >
        <LoadingSpinner />
      </div>
    )
  }

  return <AdminTable table={table} caption={caption} />
}
