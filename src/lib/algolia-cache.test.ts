import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { FIVE_MINUTES_MS, SECOND } from '~/constants/time'
import { createAlgoliaCache, invalidateAlgoliaCache } from '~/lib/algolia-cache'

const RECENT_MEMES_COUNT = 42

const createReader = () => {
  const fetchFresh = vi.fn(async (query: string) => {
    return `hits for ${query}`
  })

  return {
    fetchFresh,
    read: createAlgoliaCache({ schema: z.string(), fetchFresh })
  }
}

const readQuery = (
  read: ReturnType<typeof createReader>['read'],
  query: string
) => {
  return read({ key: query, params: query })
}

describe('createAlgoliaCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('RUNTIME_CACHE_DISABLE_BUILD_CACHE', 'true')
  })

  afterEach(async () => {
    await invalidateAlgoliaCache()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('should serve a repeated read from the cache', async () => {
    const { fetchFresh, read } = createReader()
    await readQuery(read, 'chat')

    await readQuery(read, 'chat')

    expect(fetchFresh).toHaveBeenCalledTimes(1)
  })

  it('should return the fetched result to a cached read', async () => {
    const { read } = createReader()
    await readQuery(read, 'chat')

    const result = await readQuery(read, 'chat')

    expect(result).toBe('hits for chat')
  })

  it('should fetch again once five minutes have passed', async () => {
    const { fetchFresh, read } = createReader()
    await readQuery(read, 'chat')

    vi.advanceTimersByTime(FIVE_MINUTES_MS + SECOND)
    await readQuery(read, 'chat')

    expect(fetchFresh).toHaveBeenCalledTimes(2)
  })

  it('should keep serving the cache one second before five minutes', async () => {
    const { fetchFresh, read } = createReader()
    await readQuery(read, 'chat')

    vi.advanceTimersByTime(FIVE_MINUTES_MS - SECOND)
    await readQuery(read, 'chat')

    expect(fetchFresh).toHaveBeenCalledTimes(1)
  })

  it('should share one fetch between concurrent reads of the same key', async () => {
    const { fetchFresh, read } = createReader()

    await Promise.all([readQuery(read, 'chat'), readQuery(read, 'chat')])

    expect(fetchFresh).toHaveBeenCalledTimes(1)
  })

  it('should fetch each key on its own', async () => {
    const { fetchFresh, read } = createReader()

    await readQuery(read, 'chat')
    await readQuery(read, 'chien')

    expect(fetchFresh).toHaveBeenCalledTimes(2)
  })

  it('should fetch again after a failed fetch', async () => {
    const { fetchFresh, read } = createReader()
    fetchFresh.mockRejectedValueOnce(new Error('HTTP 429'))
    await readQuery(read, 'chat').catch(() => {})

    const result = await readQuery(read, 'chat')

    expect(result).toBe('hits for chat')
  })

  it('should fetch again after an invalidation', async () => {
    const { fetchFresh, read } = createReader()
    await readQuery(read, 'chat')

    await invalidateAlgoliaCache()
    await readQuery(read, 'chat')

    expect(fetchFresh).toHaveBeenCalledTimes(2)
  })

  it('should fetch again when another reader cached the same key in another shape', async () => {
    const { read } = createReader()
    const fetchCount = vi.fn(async () => {
      return RECENT_MEMES_COUNT
    })
    const readCount = createAlgoliaCache({
      schema: z.number(),
      fetchFresh: fetchCount
    })
    await readQuery(read, 'chat')

    await readCount({ key: 'chat', params: undefined })

    expect(fetchCount).toHaveBeenCalledTimes(1)
  })

  it('should keep apart two queries the default key hash mixes up', async () => {
    const { read } = createReader()
    await readQuery(read, 'chat chien wtf top 3')

    const result = await readQuery(read, 'chat mdr top cringe 0')

    expect(result).toBe('hits for chat mdr top cringe 0')
  })

  it('should not serve what another deployment cached', async () => {
    const { fetchFresh, read } = createReader()
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_previous')
    await readQuery(read, 'chat')

    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_current')
    await readQuery(read, 'chat')

    expect(fetchFresh).toHaveBeenCalledTimes(2)
  })
})
