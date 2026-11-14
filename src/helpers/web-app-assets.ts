export type ScreenshotFormFactor = 'narrow' | 'wide'

type BuildScreenshotPathParams = {
  locale: string
  formFactor: ScreenshotFormFactor
  name: string
}

export const buildScreenshotPath = ({
  locale,
  formFactor,
  name
}: BuildScreenshotPathParams) => {
  return `/images/screenshots/${locale}/${formFactor}-${name}.webp`
}

type SplashScreenViewport = {
  width: number
  height: number
  pixelRatio: number
}

export const buildSplashScreenSize = (
  { width, height, pixelRatio }: SplashScreenViewport,
  orientation: 'portrait' | 'landscape'
) => {
  const shortSide = width * pixelRatio
  const longSide = height * pixelRatio

  return orientation === 'portrait'
    ? `${shortSide}x${longSide}`
    : `${longSide}x${shortSide}`
}

export const buildAppQrCodePath = (locale: string) => {
  return `/images/app/qr-code-${locale}.svg`
}

export const APP_SCREEN_SIZE = { width: 393, height: 759 } as const

export type AppScreenName = 'meme' | 'home'

export const buildAppScreenPath = (locale: string, name: AppScreenName) => {
  return `/images/app/screens/${locale}/${name}.webp`
}
