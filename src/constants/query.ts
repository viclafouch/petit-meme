import type { QueryMeta } from '@tanstack/react-query'

export const PRIVATE_QUERY_META = {
  isPrivate: true
} as const satisfies QueryMeta
