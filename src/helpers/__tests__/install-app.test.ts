import { describe, expect, it } from 'vitest'
import { resolveInstallMethod } from '~/helpers/install-app'

const BROWSER = {
  isStandalone: false,
  hasInstallApi: false,
  hasDeferredPrompt: false,
  hasIosHomeScreenFlag: false
}

describe('resolveInstallMethod', () => {
  it('should offer nothing inside the installed app', () => {
    expect(
      resolveInstallMethod({
        ...BROWSER,
        isStandalone: true,
        hasInstallApi: true,
        hasDeferredPrompt: true
      })
    ).toBe('installed')
  })

  it('should use the native install when the browser has the install api', () => {
    expect(resolveInstallMethod({ ...BROWSER, hasInstallApi: true })).toBe(
      'native'
    )
  })

  it('should use the native install when the browser offered its prompt', () => {
    expect(resolveInstallMethod({ ...BROWSER, hasDeferredPrompt: true })).toBe(
      'native'
    )
  })

  it('should guide an iPhone through the share sheet', () => {
    expect(
      resolveInstallMethod({ ...BROWSER, hasIosHomeScreenFlag: true })
    ).toBe('ios-guide')
  })

  it('should guide any other browser through its own menu', () => {
    expect(resolveInstallMethod(BROWSER)).toBe('browser-guide')
  })
})
