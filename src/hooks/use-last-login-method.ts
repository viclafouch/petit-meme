import React from 'react'
import { subscribeToNothing } from '~/helpers/external-store'
import { authClient } from '~/lib/auth-client'

const getLastLoginMethodSnapshot = () => {
  return authClient.getLastUsedLoginMethod() ?? null
}

const getServerLastLoginMethodSnapshot = () => {
  return null
}

export const useLastLoginMethod = () => {
  return React.useSyncExternalStore(
    subscribeToNothing,
    getLastLoginMethodSnapshot,
    getServerLastLoginMethodSnapshot
  )
}
