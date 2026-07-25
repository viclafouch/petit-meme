import { z } from 'zod'
import { ActivityEventType } from '~/db/generated/prisma/enums'

export const ACTIVITY_IP_RETENTION_DAYS = 30
export const ACTIVITY_RETENTION_DAYS = 90

export const ACTIVITY_SCOPES = [
  'all',
  'users',
  'anonymous'
] as const satisfies readonly string[]

export type ActivityScope = (typeof ACTIVITY_SCOPES)[number]

export const ACTIVITY_FILTERS_SCHEMA = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
  types: z
    .array(z.enum(ActivityEventType))
    .optional()
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Zod .catch() requires an argument
    .catch(undefined),
  scope: z.enum(ACTIVITY_SCOPES).default('all').catch('all'),
  search: z
    .string()
    .max(200)
    .optional()
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Zod .catch() requires an argument
    .catch(undefined)
})

export type ActivityFilters = z.infer<typeof ACTIVITY_FILTERS_SCHEMA>
