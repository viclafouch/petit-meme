export const OFFLINE_PAGE_PATH_BY_LOCALE = {
  fr: '/offline',
  en: '/en/offline'
} as const

export const OFFLINE_ICON_PATHNAME = '/images/offline-icon.webp'

export const SERVICE_WORKER_PATHNAME = '/sw.js'

export const WEB_APP_ID = '/'

export const WEB_APP_BACKGROUND_COLOR = '#000000'

export const WEB_APP_THEME_COLOR = '#000000'

export const APP_ICON_PATHNAME = '/android-chrome-192x192.png'

export const APPLE_SPLASH_SCREEN_VIEWPORTS = [
  { width: 440, height: 956, pixelRatio: 3 },
  { width: 402, height: 874, pixelRatio: 3 },
  { width: 420, height: 912, pixelRatio: 3 },
  { width: 430, height: 932, pixelRatio: 3 },
  { width: 393, height: 852, pixelRatio: 3 },
  { width: 390, height: 844, pixelRatio: 3 },
  { width: 428, height: 926, pixelRatio: 3 },
  { width: 375, height: 812, pixelRatio: 3 },
  { width: 414, height: 896, pixelRatio: 3 },
  { width: 414, height: 896, pixelRatio: 2 },
  { width: 375, height: 667, pixelRatio: 2 }
] as const

export const INSTALL_OFFER_STORAGE_KEY = 'install-offer-shown-at'
