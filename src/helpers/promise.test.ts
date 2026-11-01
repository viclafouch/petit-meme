import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLatch, withTimeout } from '~/helpers/promise'

const TIMEOUT_MS = 1000
const TIMEOUT_MESSAGE = 'timed out'

const neverSettles = () => {
  return new Promise<never>(() => {})
}

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should resolve with the value of work that ends in time', async () => {
    const result = withTimeout(
      async () => {
        return 'done'
      },
      TIMEOUT_MS,
      TIMEOUT_MESSAGE
    )

    await expect(result).resolves.toBe('done')
  })

  it('should reject with the message once the delay passes', async () => {
    const result = withTimeout(neverSettles, TIMEOUT_MS, TIMEOUT_MESSAGE)

    await Promise.all([
      expect(result).rejects.toThrow(TIMEOUT_MESSAGE),
      vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    ])
  })

  it('should abort the work once the delay passes', async () => {
    let workController: AbortController | undefined

    const result = withTimeout(
      (abortController) => {
        workController = abortController

        return neverSettles()
      },
      TIMEOUT_MS,
      TIMEOUT_MESSAGE
    )
    const settled = result.catch(() => {})

    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    await settled

    expect(workController?.signal.aborted).toBe(true)
  })

  it('should leave work that ends in time unaborted', async () => {
    let workController: AbortController | undefined

    await withTimeout(
      async (abortController) => {
        workController = abortController

        return 'done'
      },
      TIMEOUT_MS,
      TIMEOUT_MESSAGE
    )

    expect(workController?.signal.aborted).toBe(false)
  })
})

describe('createLatch', () => {
  it('should ignore a call made while the first one is still running', () => {
    const run = vi.fn(neverSettles)
    const latch = createLatch(run)

    void latch.run()
    void latch.run()

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('should let the next call run once the previous one failed', async () => {
    const run = vi.fn(async () => {
      throw new Error('checkout failed')
    })
    const latch = createLatch(run)

    await expect(latch.run()).rejects.toThrow('checkout failed')
    await expect(latch.run()).rejects.toThrow('checkout failed')

    expect(run).toHaveBeenCalledTimes(2)
  })

  it('should keep ignoring calls once a run ends on hold', async () => {
    const run = vi.fn(async () => {
      return 'hold' as const
    })
    const latch = createLatch(run)

    await latch.run()
    await latch.run()

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('should let the next call run once a run ends on release', async () => {
    const run = vi.fn(async () => {
      return 'release' as const
    })
    const latch = createLatch(run)

    await latch.run()
    await latch.run()

    expect(run).toHaveBeenCalledTimes(2)
  })

  it('should let the next call run once released after a hold', async () => {
    const run = vi.fn(async () => {
      return 'hold' as const
    })
    const latch = createLatch(run)

    await latch.run()
    latch.release()
    await latch.run()

    expect(run).toHaveBeenCalledTimes(2)
  })
})
