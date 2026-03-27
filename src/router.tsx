import { DefaultLoading } from '~/components/default-loading'
import { ErrorComponent } from '~/components/error-component'
import { NotFound } from '~/components/not-found'
import { IS_PRODUCTION } from '~/constants/env'
import { MINUTE, SECOND } from '~/constants/time'
import { clientEnv } from '~/env/client'
import { matchIsRateLimitError } from '~/helpers/error'
import {
  getFeedbackOptions,
  scrubSensitiveBreadcrumbs,
  scrubUserPii,
  SENSITIVE_API_PATTERNS
} from '~/lib/sentry'
import * as Sentry from '@sentry/tanstackstart-react'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import {
  deLocalizeUrl,
  isExcludedByRouteStrategy,
  localizeUrl
} from './paraglide/runtime'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * SECOND,
        gcTime: 5 * MINUTE,
        refetchOnWindowFocus: IS_PRODUCTION,
        retry: (failureCount, error) => {
          return matchIsRateLimitError(error) && failureCount < 3
        },
        retryDelay: (attemptIndex) => {
          return Math.min(
            SECOND * 2 ** attemptIndex + Math.random() * SECOND,
            10 * SECOND
          )
        }
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
    rewrite: {
      input: ({ url }) => {
        if (isExcludedByRouteStrategy(url)) {
          return url
        }

        return deLocalizeUrl(url)
      },
      output: ({ url }) => {
        if (isExcludedByRouteStrategy(url)) {
          return url
        }

        return localizeUrl(url)
      }
    },
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultStaleReloadMode: 'background',
    defaultPendingComponent: () => {
      return <DefaultLoading className="min-h-screen" />
    },
    defaultPendingMs: 3000,
    defaultPendingMinMs: 500,
    defaultPreloadDelay: 50,
    notFoundMode: 'root',
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
      enabled: IS_PRODUCTION,
      sendDefaultPii: false,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
          networkDetailDenyUrls: SENSITIVE_API_PATTERNS
        }),
        Sentry.feedbackIntegration(getFeedbackOptions())
      ],
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      denyUrls: [/extensions\//i, /^chrome:\/\//i, /^chrome-extension:\/\//i],
      ignoreErrors: [/Unreachable hosts/],
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
