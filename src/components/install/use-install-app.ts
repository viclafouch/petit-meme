import React from 'react'
import { toInstallGuideMethod } from '~/components/install/install-guide'
import {
  getInstallMethod,
  getServerInstallMethod,
  promptNativeInstall,
  subscribeToInstallMethod
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

  const install = async () => {
    if (method === null || method === 'installed') {
      return
    }

    if (method === 'native' && (await promptNativeInstall())) {
      return
    }

    dialogStore.actions.showDialog('install-app', {
      method: toInstallGuideMethod(method)
    })
  }

  return { method, install }
}
