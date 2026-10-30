import React from 'react'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { LoadingSpinner } from '~/components/ui/spinner'
import { getErrorMessage } from '~/helpers/error'
import {
  type ActivityTimelineScope,
  getActivityColumns,
  ACTIVITY_TIMELINE_SCOPES
} from '~/routes/admin/-components/activity-columns'
import { AdminTable } from '~/routes/admin/-components/admin-table'
import { PAGE_SIZE } from '~/routes/admin/-lib/constants'
import { useAppTable } from '~/routes/admin/-lib/table'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'

const EMPTY_ROWS: AdminActivityRow[] = []

type ActivityTimelineProps = {
  rows: AdminActivityRow[] | undefined
  total: number
  page: number
  onPageChange: (page: number) => void
  caption: string
  scope: ActivityTimelineScope
  isPending: boolean
  isError: boolean
  error: Error | null
  now: number
}

export const ActivityTimeline = ({
  rows,
  total,
  page,
  onPageChange,
  caption,
  scope,
  isPending,
  isError,
  error,
  now
}: ActivityTimelineProps) => {
  const columns = React.useMemo(() => {
    return getActivityColumns(now)
  }, [now])

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const currentPagination = { pageIndex: page - 1, pageSize: PAGE_SIZE }
    const nextPagination =
      typeof updater === 'function' ? updater(currentPagination) : updater

    onPageChange(nextPagination.pageIndex + 1)
  }

  const table = useAppTable({
    data: rows ?? EMPTY_ROWS,
    columns,
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
      <output aria-label={`Chargement — ${caption}`} className="block py-10">
        <LoadingSpinner />
      </output>
    )
  }

  return <AdminTable table={table} caption={caption} />
}
