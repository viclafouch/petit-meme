import { createHash } from 'node:crypto'
import type { z } from 'zod'
import { getCache, getEnv, waitUntil } from '@vercel/functions'
import { FIVE_MINUTES_IN_SECONDS } from '~/constants/time'

const ALGOLIA_CACHE_TAG = 'algolia'

const hashAlgoliaCacheKey = (key: string) => {
  return createHash('sha256').update(key).digest('hex')
}

const getAlgoliaRuntimeCache = () => {
  const { VERCEL_DEPLOYMENT_ID = 'local' } = getEnv()

  return getCache({
    namespace: `algolia-${VERCEL_DEPLOYMENT_ID}`,
    keyHashFunction: hashAlgoliaCacheKey
  })
}

export function invalidateAlgoliaCache() {
  return getAlgoliaRuntimeCache().expireTag(ALGOLIA_CACHE_TAG)
}

type CreateAlgoliaCacheParams<TParams, TSchema extends z.ZodType> = {
  schema: TSchema
  fetchFresh: (params: TParams) => Promise<z.output<TSchema>>
}

type ReadAlgoliaCacheParams<TParams> = {
  key: string
  params: TParams
}

export function createAlgoliaCache<TParams, TSchema extends z.ZodType>({
  schema,
  fetchFresh
}: CreateAlgoliaCacheParams<TParams, TSchema>) {
  const pendingRequests = new Map<string, Promise<z.output<TSchema>>>()

  const readThrough = async ({
    key,
    params
  }: ReadAlgoliaCacheParams<TParams>) => {
    const runtimeCache = getAlgoliaRuntimeCache()
    const cached = schema.safeParse(await runtimeCache.get(key))

    if (cached.success) {
      return cached.data
    }

    const fresh = await fetchFresh(params)

    waitUntil(
      runtimeCache.set(key, fresh, {
        ttl: FIVE_MINUTES_IN_SECONDS,
        tags: [ALGOLIA_CACHE_TAG]
      })
    )

    return fresh
  }

  const readAndRelease = async (
    readParams: ReadAlgoliaCacheParams<TParams>
  ) => {
    try {
      return await readThrough(readParams)
    } finally {
      pendingRequests.delete(readParams.key)
    }
  }

  return (readParams: ReadAlgoliaCacheParams<TParams>) => {
    const pending = pendingRequests.get(readParams.key)

    if (pending) {
      return pending
    }

    const request = readAndRelease(readParams)

    pendingRequests.set(readParams.key, request)

    return request
  }
}
