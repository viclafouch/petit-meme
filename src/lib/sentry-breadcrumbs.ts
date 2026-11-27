import type { Breadcrumb } from '@sentry/tanstackstart-react'

const SENSITIVE_API_PATHS = [
  '/api/auth/',
  '/api/stripe/'
] as const satisfies readonly string[]

const matchIsSensitiveApiUrl = (url: string) => {
  return SENSITIVE_API_PATHS.some((path) => {
    return url.includes(path)
  })
}

export const scrubSensitiveBreadcrumbs = (breadcrumb: Breadcrumb) => {
  const isNetworkBreadcrumb =
    breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch'

  if (!isNetworkBreadcrumb) {
    return breadcrumb
  }

  const breadcrumbData: Record<string, unknown> = breadcrumb.data ?? {}
  const { url, method } = breadcrumbData

  if (typeof url !== 'string' || !matchIsSensitiveApiUrl(url)) {
    return breadcrumb
  }

  return {
    ...breadcrumb,
    data: { url, method }
  }
}
