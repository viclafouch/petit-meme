import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  createTableHook,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures
} from '@tanstack/react-table'

const ADMIN_TABLE_FEATURES = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text
  }
})

export type AdminTableFeatures = typeof ADMIN_TABLE_FEATURES

export const { createAppColumnHelper, useAppTable } = createTableHook({
  features: ADMIN_TABLE_FEATURES,
  getRowId: (row: { id: string }) => {
    return row.id
  }
})
