import type { AssetType, ResolvedAssetSize } from '@vite-pwa/assets-generator'
import {
  createAppleSplashScreens,
  defineConfig
} from '@vite-pwa/assets-generator/config'
import {
  APPLE_SPLASH_SCREEN_VIEWPORTS,
  WEB_APP_BACKGROUND_COLOR
} from './src/constants/pwa.ts'

const SMALL_APP_ICON_SIZE = 192
const LARGE_APP_ICON_SIZE = 512
const APPLE_TOUCH_ICON_SIZE = 180
const APP_ICON_PADDING = 0.26
const MASKABLE_ICON_PADDING = 0.34

const APP_ICON_RESIZE_OPTIONS = { background: WEB_APP_BACKGROUND_COLOR }

const ASSET_NAMES = {
  transparent: ({ width, height }) => {
    return `android-chrome-${width}x${height}.png`
  },
  maskable: ({ width, height }) => {
    return `maskable-icon-${width}x${height}.png`
  },
  apple: () => {
    return 'apple-touch-icon.png'
  }
} satisfies Record<AssetType, (size: ResolvedAssetSize) => string>

const splashScreenDevices = Object.fromEntries(
  APPLE_SPLASH_SCREEN_VIEWPORTS.map(({ width, height, pixelRatio }) => {
    return [
      `${width}x${height}@${pixelRatio}`,
      {
        width: width * pixelRatio,
        height: height * pixelRatio,
        scaleFactor: pixelRatio
      }
    ]
  })
)

export default defineConfig({
  images: ['public/app-icon-mark.png'],
  preset: {
    assetName: (type, size) => {
      return ASSET_NAMES[type](size)
    },
    transparent: {
      sizes: [SMALL_APP_ICON_SIZE, LARGE_APP_ICON_SIZE],
      padding: APP_ICON_PADDING
    },
    maskable: {
      sizes: [LARGE_APP_ICON_SIZE],
      padding: MASKABLE_ICON_PADDING,
      resizeOptions: APP_ICON_RESIZE_OPTIONS
    },
    apple: {
      sizes: [APPLE_TOUCH_ICON_SIZE],
      padding: APP_ICON_PADDING,
      resizeOptions: APP_ICON_RESIZE_OPTIONS
    },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.55,
        resizeOptions: { background: WEB_APP_BACKGROUND_COLOR, fit: 'contain' },
        linkMediaOptions: { log: false },
        name: (landscape, size) => {
          return `images/splash/${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`
        }
      },
      [],
      splashScreenDevices
    )
  }
})
