import React from 'react'
import { useMatches } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'
import { clientEnv } from '~/env/client'
import { trackAppInstallation } from '~/lib/install-app'
import { scrubAnalyticsEvent, toAnalyticsPageView } from '~/lib/web-analytics'
import { getLocale } from '~/paraglide/runtime'

export const WebAnalytics = () => {
  const leafMatch = useMatches({
    select: (matches) => {
      return matches.at(-1)
    }
  })
  const pageView = toAnalyticsPageView(leafMatch, getLocale())

  React.useEffect(() => {
    return trackAppInstallation()
  }, [])

  return (
    <Analytics
      route={pageView?.route ?? null}
      path={pageView?.path ?? null}
      beforeSend={scrubAnalyticsEvent}
      configString={clientEnv.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
    />
  )
}
