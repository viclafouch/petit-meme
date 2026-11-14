import { z } from 'zod'

const SHARED_VALUE_MAX_LENGTH = 2048

const SHARED_VALUE_SCHEMA = z
  .string()
  .max(SHARED_VALUE_MAX_LENGTH)
  .optional()
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  .catch(undefined)

export const SUBMIT_SEARCH_SCHEMA = z.object({
  url: SHARED_VALUE_SCHEMA,
  text: SHARED_VALUE_SCHEMA
})
