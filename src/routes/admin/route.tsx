import React from 'react'
import { AdminNavButton } from '@/components/admin/admin-nav-button'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { PathBreadcrumbs } from '@/components/path-breadcrumbs'
import { Container } from '@/components/ui/container'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useTheme } from '@/lib/theme'
import { Separator } from '@radix-ui/react-separator'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

const RouteComponent = () => {
  const { user } = Route.useRouteContext()
  const { setTheme } = useTheme()

  React.useLayoutEffect(() => {
    setTheme('dark')
  }, [])

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)'
        } as React.CSSProperties
      }
    >
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
              <PathBreadcrumbs />
            </div>
            <AdminNavButton user={user} />
          </header>
          <Outlet />
        </Container>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const Route = createFileRoute('/admin')({
  component: RouteComponent,
  beforeLoad: async ({ location, context }) => {
    if (!context.user || context.user.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    if (location.pathname === '/admin') {
      throw redirect({ to: '/admin/library' })
    }

    return { user: context.user }
  }
})
