import { DefaultLoading } from '@/components/default-loading'
import { ErrorComponent } from '@/components/error-component'
import { NotFound } from '@/components/not-found'
import { MINUTE, SECOND } from '@/constants/time'
import { clientEnv } from '@/env/client'
import {
  FEEDBACK_OPTIONS,
  scrubSensitiveBreadcrumbs,
  scrubUserPii,
  SENSITIVE_API_PATTERNS
} from '@/lib/sentry'
import * as Sentry from '@sentry/tanstackstart-react'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * SECOND,
        gcTime: 5 * MINUTE,
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        retry: false
      },
      mutations: {
        retry: false,
        gcTime: 5 * MINUTE
      }
    }
  })

  const router = createRouter({
    routeTree,
    context: { queryClient, user: null },
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultPendingMs: 1000,
    defaultPendingMinMs: 200,
    defaultPreloadDelay: 50,
    notFoundMode: 'root',
    defaultPendingComponent: DefaultLoading,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ({ error }) => {
      return <ErrorComponent error={error} />
    },
    defaultPreload: 'intent',
    scrollRestoration: true
  })

  if (!router.isServer) {
    Sentry.init({
      dsn: clientEnv.VITE_SENTRY_DSN,
      tunnel: '/api/sentry-tunnel',
      environment: process.env.NODE_ENV,
      enabled: process.env.NODE_ENV === 'production',
      sendDefaultPii: false,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
          networkDetailDenyUrls: SENSITIVE_API_PATTERNS
        }),
        Sentry.feedbackIntegration(FEEDBACK_OPTIONS)
      ],
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      denyUrls: [/extensions\//i, /^chrome:\/\//i, /^chrome-extension:\/\//i],
      beforeSend: scrubUserPii,
      beforeBreadcrumb: scrubSensitiveBreadcrumbs
    })
  }

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
