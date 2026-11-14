import { clientsClaim } from '@vite-pwa/workbox-swkit/core'
import { enable as enableNavigationPreload } from '@vite-pwa/workbox-swkit/navigation-preload'
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute
} from '@vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@vite-pwa/workbox-swkit/routing'
import { NetworkOnly } from '@vite-pwa/workbox-swkit/strategies'
import { OFFLINE_PAGE_PATH_BY_LOCALE } from '~/constants/pwa'

declare const self: ServiceWorkerGlobalScope

const ENGLISH_PATH_PATTERN = /^\/en(?:\/|$)/u

const NAVIGATIONS_LEFT_TO_THE_BROWSER = [/^\/api\//u, /^\/admin(?:\/|$)/u]

const getOfflinePageUrl = (url: URL) => {
  return ENGLISH_PATH_PATTERN.test(url.pathname)
    ? OFFLINE_PAGE_PATH_BY_LOCALE.en
    : OFFLINE_PAGE_PATH_BY_LOCALE.fr
}

const network = new NetworkOnly()

void self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
enableNavigationPreload()

registerRoute(
  new NavigationRoute(
    async (options) => {
      try {
        return await network.handle(options)
      } catch {
        const offlinePage = await matchPrecache(getOfflinePageUrl(options.url))

        return offlinePage ?? Response.error()
      }
    },
    { denylist: NAVIGATIONS_LEFT_TO_THE_BROWSER }
  )
)
