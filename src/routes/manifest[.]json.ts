import { createFileRoute } from '@tanstack/react-router'
import { SITE_NAME } from '~/constants/branding'
import {
  WEB_APP_BACKGROUND_COLOR,
  WEB_APP_ID,
  WEB_APP_THEME_COLOR
} from '~/constants/pwa'
import {
  buildScreenshotPath,
  type ScreenshotFormFactor
} from '~/helpers/web-app-assets'
import { m } from '~/paraglide/messages'
import { baseLocale, getLocale } from '~/paraglide/runtime'

const NARROW_SCREENSHOT_SIZE = '780x1328'
const WIDE_SCREENSHOT_SIZE = '1440x900'

const getLocalizedPathname = (pathname: string) => {
  const locale = getLocale()

  if (locale === baseLocale) {
    return pathname
  }

  return `/${locale}${pathname}`
}

const withLauncherTracking = (pathname: string) => {
  return `${getLocalizedPathname(pathname)}?utm_medium=PWA&utm_source=launcher`
}

type BuildScreenshotParams = {
  name: string
  formFactor: ScreenshotFormFactor
  label: string
}

const buildScreenshot = ({
  name,
  formFactor,
  label
}: BuildScreenshotParams) => {
  return {
    src: buildScreenshotPath({ locale: getLocale(), formFactor, name }),
    type: 'image/webp',
    sizes:
      formFactor === 'narrow' ? NARROW_SCREENSHOT_SIZE : WIDE_SCREENSHOT_SIZE,
    form_factor: formFactor,
    label
  }
}

const buildManifest = () => {
  return {
    id: WEB_APP_ID,
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: m.manifest_description(),
    lang: getLocale(),
    dir: 'ltr',
    start_url: withLauncherTracking('/memes'),
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: WEB_APP_BACKGROUND_COLOR,
    theme_color: WEB_APP_THEME_COLOR,
    categories: [
      m.manifest_category_entertainment(),
      m.manifest_category_humor(),
      m.manifest_category_memes(),
      m.manifest_category_creation(),
      m.manifest_category_social()
    ],
    icons: [
      {
        src: '/android-chrome-192x192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any'
      },
      {
        src: '/android-chrome-512x512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any'
      },
      {
        src: '/maskable-icon-512x512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: m.nav_reels(),
        short_name: m.nav_reels(),
        description: m.manifest_shortcut_reels_description(),
        url: withLauncherTracking('/reels'),
        icons: [
          {
            src: '/images/shortcuts/reels.png',
            type: 'image/png',
            sizes: '96x96'
          }
        ]
      },
      {
        name: m.nav_search(),
        short_name: m.nav_search(),
        description: m.manifest_shortcut_search_description(),
        url: withLauncherTracking('/memes'),
        icons: [
          {
            src: '/images/shortcuts/search.png',
            type: 'image/png',
            sizes: '96x96'
          }
        ]
      }
    ],
    screenshots: [
      buildScreenshot({
        name: 'home',
        formFactor: 'narrow',
        label: m.manifest_screenshot_home()
      }),
      buildScreenshot({
        name: 'reels',
        formFactor: 'narrow',
        label: m.manifest_screenshot_reels()
      }),
      buildScreenshot({
        name: 'meme',
        formFactor: 'narrow',
        label: m.manifest_screenshot_meme()
      }),
      buildScreenshot({
        name: 'home',
        formFactor: 'wide',
        label: m.manifest_screenshot_home()
      }),
      buildScreenshot({
        name: 'meme',
        formFactor: 'wide',
        label: m.manifest_screenshot_meme()
      })
    ],
    launch_handler: {
      client_mode: ['navigate-existing', 'auto']
    },
    handle_links: 'preferred',
    share_target: {
      action: getLocalizedPathname('/submit'),
      method: 'GET',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        url: 'url',
        text: 'text'
      }
    },
    prefer_related_applications: false
  }
}

export const Route = createFileRoute('/manifest.json')({
  server: {
    handlers: {
      GET: () => {
        return Response.json(buildManifest(), {
          headers: {
            'Content-Type': 'application/manifest+json'
          }
        })
      }
    }
  }
})
