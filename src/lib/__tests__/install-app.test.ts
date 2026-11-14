import { afterEach, describe, expect, it, vi } from 'vitest'
import { track } from '@vercel/analytics'
import {
  promptNativeInstall,
  trackInstallClicked,
  trackInstallPromptAnswered
} from '~/lib/install-app'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('@vercel/analytics'), () => {
  return { track: vi.fn<typeof track>() }
})

vi.mock(import('~/lib/sentry'), () => {
  return { captureWithFeature: vi.fn<typeof captureWithFeature>() }
})

const stubInstallApi = (install: () => Promise<void>) => {
  vi.stubGlobal('navigator', { install })
}

describe('promptNativeInstall', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should report an accepted install', async () => {
    stubInstallApi(async () => {})

    await expect(promptNativeInstall()).resolves.toBe('accepted')
  })

  it('should report a dismissal without raising an error', async () => {
    stubInstallApi(async () => {
      throw new DOMException('Dismissed', 'AbortError')
    })

    await expect(promptNativeInstall()).resolves.toBe('dismissed')
    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should report a failure to Sentry and let the guide take over', async () => {
    const failure = new DOMException('No manifest id', 'DataError')

    stubInstallApi(async () => {
      throw failure
    })

    await expect(promptNativeInstall()).resolves.toBe('unavailable')
    expect(captureWithFeature).toHaveBeenCalledWith(failure, 'install-app')
  })
})

describe('install analytics', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should send where the install was clicked and which path it took', () => {
    trackInstallClicked({ surface: 'account-drawer', method: 'ios-guide' })

    expect(track).toHaveBeenCalledWith('Install Clicked', {
      surface: 'account-drawer',
      method: 'ios-guide'
    })
  })

  it('should send how the install prompt was answered', () => {
    trackInstallPromptAnswered({ surface: 'home', outcome: 'dismissed' })

    expect(track).toHaveBeenCalledWith('Install Prompt Answered', {
      surface: 'home',
      outcome: 'dismissed'
    })
  })
})
