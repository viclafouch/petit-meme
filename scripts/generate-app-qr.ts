import fs from 'node:fs/promises'
import path from 'node:path'
import { encode, QrCodeDataType } from 'uqr'
import { SITE_URL } from '~/emails/constants'
import { buildAppQrCodePath } from '~/helpers/web-app-assets'
import { type Locale, locales, localizeUrl } from '~/paraglide/runtime'

const MODULE_COLOR = '#000'
const DOT_DIAMETER = 0.84
const LOGO_AREA_RATIO = 0.22
const FINDER_SIZE = 7
const MODULE_CENTER = 0.5
const FINDER_RELATIVE_PATH =
  'm1 0h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm0 1v5h5v-5zm1.5 1h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5z'

type Point = {
  x: number
  y: number
}

const matchIsInLogoArea = ({ x, y }: Point, size: number) => {
  const half = (size * LOGO_AREA_RATIO) / 2
  const center = size / 2

  return (
    Math.abs(x + MODULE_CENTER - center) <= half &&
    Math.abs(y + MODULE_CENTER - center) <= half
  )
}

const buildFinderPath = ({ x, y }: Point) => {
  return `M${x} ${y}${FINDER_RELATIVE_PATH}`
}

const buildSquarePath = ({ x, y }: Point) => {
  return `M${x} ${y}h1v1h-1z`
}

const buildDotPath = ({ x, y }: Point) => {
  return `M${x + MODULE_CENTER} ${y + MODULE_CENTER}h0`
}

const buildQrCodeSvg = (url: string) => {
  const { size, data, types } = encode(url, { ecc: 'H', border: 0 })
  const lastFinderOrigin = size - FINDER_SIZE

  const finderPaths = [
    { x: 0, y: 0 },
    { x: lastFinderOrigin, y: 0 },
    { x: 0, y: lastFinderOrigin }
  ].map(buildFinderPath)

  const darkModules = data.flatMap((row, y) => {
    return row.flatMap((isDark, x) => {
      const point = { x, y }
      const type = types[y]?.[x]

      if (
        !isDark ||
        type === QrCodeDataType.Position ||
        matchIsInLogoArea(point, size)
      ) {
        return []
      }

      return [{ point, isData: type === QrCodeDataType.Data }]
    })
  })

  const dotPaths = darkModules
    .filter(({ isData }) => {
      return isData
    })
    .map(({ point }) => {
      return buildDotPath(point)
    })

  const squarePaths = darkModules
    .filter(({ isData }) => {
      return !isData
    })
    .map(({ point }) => {
      return buildSquarePath(point)
    })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path fill="${MODULE_COLOR}" fill-rule="evenodd" d="${[...finderPaths, ...squarePaths].join('')}"/><path stroke="${MODULE_COLOR}" stroke-width="${DOT_DIAMETER}" stroke-linecap="round" d="${dotPaths.join('')}"/></svg>\n`
}

const writeAppQrCode = async (locale: Locale) => {
  const url = localizeUrl(new URL('/app', SITE_URL), { locale }).href
  const filePath = path.resolve(`public${buildAppQrCodePath(locale)}`)

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buildQrCodeSvg(url))
  console.log(`${url} → ${filePath}`)
}

void Promise.all(locales.map(writeAppQrCode))
