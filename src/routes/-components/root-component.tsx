import React from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import { getRouteApi, Outlet } from '@tanstack/react-router'
import { RootDocument } from './root-document'

const rootRouteApi = getRouteApi('__root__')

export const RootComponent = () => {
  const { user } = rootRouteApi.useRouteContext()

  React.useEffect(() => {
    Sentry.setUser(user ? { id: user.id, email: user.email } : null)
  }, [user])

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}
