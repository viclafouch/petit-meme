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
