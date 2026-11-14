import {
  createAppleSplashScreens,
  defineConfig
} from '@vite-pwa/assets-generator/config'
import {
  APPLE_SPLASH_SCREEN_VIEWPORTS,
  WEB_APP_BACKGROUND_COLOR
} from './src/constants/pwa.ts'

const MASKABLE_ICON_SIZE = 512

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
  images: ['public/android-chrome-512x512.png'],
  preset: {
    transparent: {
      sizes: []
    },
    maskable: {
      sizes: [MASKABLE_ICON_SIZE],
      padding: 0.3,
      resizeOptions: { background: WEB_APP_BACKGROUND_COLOR }
    },
    apple: {
      sizes: []
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
