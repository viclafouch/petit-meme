import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { DefaultLoading } from '~/components/app/default-loading'
import { ErrorComponent } from '~/components/app/error-component'
import { NotFound } from '~/components/app/not-found'
import { IS_PRODUCTION } from '~/constants/env'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { trackRouterNavigation } from '~/lib/sentry-client'
import {
  deLocalizeUrl,
  isExcludedByRouteStrategy,
  localizeUrl
} from './paraglide/runtime'
import { routeTree } from './routeTree.gen'

const QUERY_STALE_TIME_MS = 30_000

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: FIVE_MINUTES_MS,
        refetchOnWindowFocus: IS_PRODUCTION,
        retry: false
      },
      mutations: {
        retry: false,
        gcTime: FIVE_MINUTES_MS
      }
    }
  })

  const router = createRouter({
    routeTree,
    context: { queryClient, user: null },
    rewrite: {
      input: ({ url }) => {
        return deLocalizeUrl(url)
      },
      output: ({ url }) => {
        if (isExcludedByRouteStrategy(url)) {
          return url
        }

        return localizeUrl(url)
      }
    },
    defaultPreloadStaleTime: 0,
    defaultStaleReloadMode: 'background',
    defaultPendingComponent: () => {
      return <DefaultLoading className="flex-1" />
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
    trackRouterNavigation(router)
  }

  setupRouterSsrQueryIntegration({
    router,
    queryClient
  })

  return router
}

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line consistent-type-definitions -- TS module augmentation requires interface
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
