import type { searchClient } from '@algolia/client-search'

type AlgoliaClientOptions = NonNullable<Parameters<typeof searchClient>[2]>

export const ALGOLIA_FAIL_FAST_ON_RATE_LIMIT = {
  maxRateLimitRetries: 0
} as const satisfies AlgoliaClientOptions

export const ALGOLIA_WAIT_ON_RATE_LIMIT = {
  maxRateLimitRetries: 3
} as const satisfies AlgoliaClientOptions
