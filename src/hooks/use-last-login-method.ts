import React from 'react'
import { authClient } from '~/lib/auth-client'

export const useLastLoginMethod = () => {
  const [lastMethod] = React.useState(() => {
    return authClient.getLastUsedLoginMethod() ?? null
  })

  return lastMethod
}
