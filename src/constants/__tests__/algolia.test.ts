import { describe, expect, it, vi } from 'vitest'
import { searchClient } from '@algolia/client-search'
import { ALGOLIA_FAIL_FAST_ON_RATE_LIMIT } from '~/constants/algolia'

const RATE_LIMITED_RESPONSE = {
  status: 429,
  content: JSON.stringify({ message: 'Too Many Requests' }),
  headers: { 'retry-after': '60' },
  isTimedOut: false
}

const createRateLimitedClient = () => {
  const send = vi.fn(async () => {
    return RATE_LIMITED_RESPONSE
  })
  const client = searchClient('APP_ID', 'API_KEY', {
    ...ALGOLIA_FAIL_FAST_ON_RATE_LIMIT,
    requester: { send }
  })

  return { client, send }
}

const searchRateLimited = (client: ReturnType<typeof searchClient>) => {
  return client.searchSingleIndex({ indexName: 'memes', searchParams: {} })
}

describe('a search client with the fail fast options', () => {
  it('should fail the request on the first 429', async () => {
    const { client } = createRateLimitedClient()

    const request = searchRateLimited(client)

    await expect(request).rejects.toMatchObject({ status: 429 })
  })

  it('should send a rate limited request only once', async () => {
    const { client, send } = createRateLimitedClient()

    await searchRateLimited(client).catch(() => {})

    expect(send).toHaveBeenCalledTimes(1)
  })
})
