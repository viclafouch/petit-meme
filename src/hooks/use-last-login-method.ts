import React from 'react'
import { authClient } from '~/lib/auth-client'

export const useLastLoginMethod = () => {
  // oxlint-disable-next-line react/hook-use-state -- no setter needed, useState used as one-time initializer
  const [lastMethod] = React.useState(() => {
    return authClient.getLastUsedLoginMethod() ?? null
  })

  return lastMethod
}
