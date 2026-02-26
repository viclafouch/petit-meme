import React from 'react'
import { ErrorComponent } from '@/components/error-component'
import { PathBreadcrumbs } from '@/components/path-breadcrumbs'
import { Container } from '@/components/ui/container'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useTheme } from '@/lib/theme'
import { AdminNavButton } from '@admin/-components/admin-nav-button'
import { AdminSidebar } from '@admin/-components/admin-sidebar'
import { Separator } from '@radix-ui/react-separator'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

const RouteComponent = () => {
  const { user } = Route.useRouteContext()
  const { setTheme } = useTheme()

  React.useLayoutEffect(() => {
    setTheme('dark')
  }, [setTheme])

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
  errorComponent: ErrorComponent,
  beforeLoad: async ({ context }) => {
    if (!context.user || context.user.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    return { user: context.user }
  },
  head: () => {
    return {
      meta: [{ name: 'robots', content: 'noindex,nofollow' }]
    }
  }
})
