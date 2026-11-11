import React from 'react'
import { getRouteApi, Outlet } from '@tanstack/react-router'
import { Container } from '~/components/ui/container'
import { Separator } from '~/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '~/components/ui/sidebar'
import { AdminNavButton } from '~/routes/admin/-components/admin-nav-button'
import { AdminSidebar } from '~/routes/admin/-components/admin-sidebar'
import { PathBreadcrumbs } from '~/routes/admin/-components/path-breadcrumbs'
import { useCrumbMatches } from '~/routes/admin/-components/use-crumb-matches'
import { useThemeStore } from '~/stores/theme.store'

const routeApi = getRouteApi('/admin')

export const AdminLayout = () => {
  const { user } = routeApi.useRouteContext()
  const { setTheme } = useThemeStore().actions
  const crumbMatches = useCrumbMatches()

  React.useLayoutEffect(() => {
    setTheme('dark')
  }, [setTheme])

  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)' }}>
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <Container>
          <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-4"
              />
              {crumbMatches.length > 0 ? (
                <PathBreadcrumbs crumbMatches={crumbMatches} />
              ) : null}
            </div>
            <AdminNavButton user={user} />
          </header>
          <Outlet />
        </Container>
      </SidebarInset>
    </SidebarProvider>
  )
}
