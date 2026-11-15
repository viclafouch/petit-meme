import {
  columnVisibilityFeature,
  constructSortFn,
  createPaginatedRowModel,
  createSortedRowModel,
  createTableHook,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_datetime,
  tableFeatures
} from '@tanstack/react-table'

const TEXT_COLLATOR = new Intl.Collator('fr', {
  numeric: true,
  sensitivity: 'base'
})

const sortFnCollatedText = constructSortFn({
  resolveDataValue: (dataValue) => {
    return typeof dataValue === 'string' ? dataValue : ''
  },
  sort: (dataValueA: string, dataValueB: string) => {
    return TEXT_COLLATOR.compare(dataValueA, dataValueB)
  }
})

const ADMIN_TABLE_FEATURES = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFnCollatedText,
    datetime: sortFn_datetime,
    text: sortFnCollatedText
  }
})

export type AdminTableFeatures = typeof ADMIN_TABLE_FEATURES

export const { createAppColumnHelper, useAppTable } = createTableHook({
  features: ADMIN_TABLE_FEATURES,
  getRowId: (row: { id: string }) => {
    return row.id
  }
})
