import { rootRouteId } from '@tanstack/react-router'
import type { BeforeSendEvent } from '@vercel/analytics/react'
import { localizeHref, type Locale } from '~/paraglide/runtime'

const PATH_PARAM = /\$(?<name>\w+)/gu
const INDEX_TRAILING_SLASH = /(?<=.)\/$/u
const ADMINISTRATION_PATH = /^\/admin(?:\/|$)/u

type PageMatch = {
  routeId: string
  fullPath: string
  pathname: string
}

const trimIndexSlash = (path: string) => {
  return path.replace(INDEX_TRAILING_SLASH, '')
}

export const toAnalyticsPageView = (
  leafMatch: PageMatch | undefined,
  locale: Locale
) => {
  if (
    !leafMatch ||
    leafMatch.routeId === rootRouteId ||
    ADMINISTRATION_PATH.test(leafMatch.pathname)
  ) {
    return null
  }

  return {
    route: trimIndexSlash(
      leafMatch.fullPath.replaceAll(PATH_PARAM, '[$<name>]')
    ),
    path: localizeHref(trimIndexSlash(leafMatch.pathname), { locale })
  }
}

export const scrubAnalyticsEvent = (event: BeforeSendEvent) => {
  const url = new URL(event.url)
  url.search = ''
  url.hash = ''

  return { ...event, url: url.href }
}
