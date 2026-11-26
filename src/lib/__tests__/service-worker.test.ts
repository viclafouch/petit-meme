import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureWithFeature } from '~/lib/sentry'
import { registerServiceWorker } from '~/lib/service-worker'

vi.mock(import('~/constants/env'), () => {
  return { IS_PRODUCTION: true, IS_DEVELOPMENT: false, IS_TEST: true }
})

vi.mock(import('~/lib/sentry'), () => {
  return { captureWithFeature: vi.fn<typeof captureWithFeature>() }
})

const register = vi.fn<ServiceWorkerContainer['register']>()

const addEventListener = vi.fn<(type: string, listener: () => void) => void>()

const registerAfterLoad = async () => {
  vi.stubGlobal('window', { addEventListener })
  registerServiceWorker()

  const [[, onLoad] = []] = addEventListener.mock.calls
  onLoad?.()

  await vi.waitFor(() => {
    expect(register).toHaveBeenCalledTimes(1)
  })
  await Promise.resolve()
}

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { serviceWorker: { register } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    new TypeError(
      "Failed to register a ServiceWorker for scope ('https://www.petit-meme.io/') with script ('https://www.petit-meme.io/sw.js'): An unknown error occurred when fetching the script."
    ),
    new DOMException(
      "Failed to register a ServiceWorker for scope ('https://www.petit-meme.io/') with script ('https://www.petit-meme.io/sw.js'): An unknown error occurred when fetching the script.",
      'AbortError'
    ),
    new TypeError(
      "Failed to register a ServiceWorker for scope ('https://www.petit-meme.io/') with script ('https://www.petit-meme.io/sw.js'): A bad HTTP response code (407) was received when fetching the script."
    ),
    new TypeError('Script https://www.petit-meme.io/sw.js load failed'),
    new Error('Rejected')
  ])(
    'should stay silent when the browser cannot reach the script: $message',
    async (refusal) => {
      register.mockRejectedValueOnce(refusal)

      await registerAfterLoad()

      expect(captureWithFeature).not.toHaveBeenCalled()
    }
  )

  it('should report a script our server answers with an error', async () => {
    const error = new TypeError(
      "Failed to register a ServiceWorker for scope ('https://www.petit-meme.io/') with script ('https://www.petit-meme.io/sw.js'): A bad HTTP response code (404) was received when fetching the script."
    )
    register.mockRejectedValueOnce(error)

    await registerAfterLoad()

    expect(captureWithFeature).toHaveBeenCalledExactlyOnceWith(
      error,
      'service-worker'
    )
  })
})
