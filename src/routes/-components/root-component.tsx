import React from 'react'
import { getRouteApi, Outlet } from '@tanstack/react-router'
import { setSentryUser } from '~/lib/sentry-client'
import { RootDocument } from './root-document'

const rootRouteApi = getRouteApi('__root__')

export const RootComponent = () => {
  const { user } = rootRouteApi.useRouteContext()

  React.useEffect(() => {
    setSentryUser(user ? { id: user.id } : null)
  }, [user])

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}
