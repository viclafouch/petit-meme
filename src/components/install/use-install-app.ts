import React from 'react'
import { toInstallGuideMethod } from '~/components/install/install-guide'
import {
  getInstallMethod,
  getServerInstallMethod,
  type InstallSurface,
  promptNativeInstall,
  subscribeToInstallMethod,
  trackInstallClicked,
  trackInstallPromptAnswered
} from '~/lib/install-app'
import { useDialogStore } from '~/stores/dialog.store'

export const useInstallMethod = () => {
  return React.useSyncExternalStore(
    subscribeToInstallMethod,
    getInstallMethod,
    getServerInstallMethod
  )
}

export const useInstallApp = () => {
  const dialogStore = useDialogStore()
  const method = useInstallMethod()

  const install = async (surface: InstallSurface) => {
    if (method === null || method === 'installed') {
      return
    }

    trackInstallClicked({ surface, method })

    if (method === 'native') {
      const outcome = await promptNativeInstall()

      if (outcome !== 'unavailable') {
        trackInstallPromptAnswered({ surface, outcome })

        return
      }
    }

    dialogStore.actions.showDialog('install-app', {
      method: toInstallGuideMethod(method)
    })
  }

  return { method, install }
}
