import { DefaultLoading } from '@/components/default-loading'
import { ErrorComponent } from '@/components/error-component'
import { NotFound } from '@/components/not-found'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        staleTime: 1000 * 60 * 2 // 2min
      },
      mutations: {
        retry: false
      }
    }
  })

  const router = createRouter({
    routeTree,
    context: { queryClient, user: null },
    defaultPreloadStaleTime: 30_000, // 30s,
    defaultStaleTime: 30_000, // 30s,
    defaultPendingMs: 1000,
    defaultViewTransition: false,
    notFoundMode: 'root',
    defaultPendingComponent: DefaultLoading,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ({ error }) => {
      return <ErrorComponent error={error} />
    },
    defaultPreload: 'intent',
    scrollRestoration: true
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient
  })

  return router
}

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
