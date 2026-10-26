import { describe, expect, it } from 'vitest'
import { CancelledError, QueryClient } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { removePrivateQueries } from '~/lib/private-queries'

const PRIVATE_KEY = ['auth-user']
const PUBLIC_KEY = ['memes', 'trending']

const createSeededClient = async () => {
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.query({
      queryKey: PRIVATE_KEY,
      queryFn: () => {
        return { id: 'user-1' }
      },
      meta: PRIVATE_QUERY_META
    }),
    queryClient.query({
      queryKey: PUBLIC_KEY,
      queryFn: () => {
        return ['meme-1']
      }
    })
  ])

  return queryClient
}

describe('removePrivateQueries', () => {
  it('should remove every query marked private', async () => {
    const queryClient = await createSeededClient()

    await removePrivateQueries(queryClient)

    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined()
  })

  it('should keep the public queries', async () => {
    const queryClient = await createSeededClient()

    await removePrivateQueries(queryClient)

    expect(queryClient.getQueryData(PUBLIC_KEY)).toStrictEqual(['meme-1'])
  })

  it('should cancel a private fetch in flight', async () => {
    const queryClient = new QueryClient()
    const pendingFetch = queryClient.query({
      queryKey: PRIVATE_KEY,
      queryFn: () => {
        return new Promise(() => {})
      },
      meta: PRIVATE_QUERY_META
    })

    await removePrivateQueries(queryClient)

    await expect(pendingFetch).rejects.toBeInstanceOf(CancelledError)
  })
})
