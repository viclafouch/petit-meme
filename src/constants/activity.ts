import { z } from 'zod'
import {
  SEARCH_PARAM_MAX_PAGE,
  SEARCH_QUERY_MAX_LENGTH
} from '~/constants/search-params'
import { ActivityEventType } from '~/db/generated/prisma/enums'

export const ACTIVITY_IP_RETENTION_DAYS = 30
export const ACTIVITY_RETENTION_DAYS = 90

export const ACTIVITY_SCOPES = [
  'all',
  'users',
  'anonymous'
] as const satisfies readonly string[]

export type ActivityScope = (typeof ACTIVITY_SCOPES)[number]

export const ACTIVITY_PAGE_SCHEMA = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEARCH_PARAM_MAX_PAGE)
    .default(1)
    // oxlint-disable-next-line promise/prefer-await-to-then -- Zod's catch() sets the parse fallback, it is no promise
    .catch(1)
})

export const ACTIVITY_FILTERS_SCHEMA = ACTIVITY_PAGE_SCHEMA.extend({
  types: z
    .array(z.enum(ActivityEventType))
    .optional()
    // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
    .catch(undefined),
  // oxlint-disable-next-line promise/prefer-await-to-then -- Zod's catch() sets the parse fallback, it is no promise
  scope: z.enum(ACTIVITY_SCOPES).default('all').catch('all'),
  search: z
    .string()
    .max(SEARCH_QUERY_MAX_LENGTH)
    .optional()
    // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
    .catch(undefined)
})

export type ActivityFilters = z.infer<typeof ACTIVITY_FILTERS_SCHEMA>
