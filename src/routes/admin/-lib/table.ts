import type { PaginationState } from '@tanstack/react-table'
import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  createTableHook,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures
} from '@tanstack/react-table'
import { PAGE_SIZE } from '~/routes/admin/-lib/constants'

export const INITIAL_PAGINATION = {
  pageIndex: 0,
  pageSize: PAGE_SIZE
} as const satisfies PaginationState

const ADMIN_TABLE_FEATURES = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel()
})

export type AdminTableFeatures = typeof ADMIN_TABLE_FEATURES

export const { createAppColumnHelper, useAppTable } = createTableHook({
  features: ADMIN_TABLE_FEATURES,
  getRowId: (row: { id: string }) => {
    return row.id
  }
})
