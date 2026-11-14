export type InstallMethod =
  | 'installed'
  | 'native'
  | 'ios-guide'
  | 'browser-guide'

type ResolveInstallMethodParams = {
  isStandalone: boolean
  hasInstallApi: boolean
  hasDeferredPrompt: boolean
  hasIosHomeScreenFlag: boolean
}

export const resolveInstallMethod = ({
  isStandalone,
  hasInstallApi,
  hasDeferredPrompt,
  hasIosHomeScreenFlag
}: ResolveInstallMethodParams): InstallMethod => {
  if (isStandalone) {
    return 'installed'
  }

  if (hasInstallApi || hasDeferredPrompt) {
    return 'native'
  }

  if (hasIosHomeScreenFlag) {
    return 'ios-guide'
  }

  return 'browser-guide'
}
