import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { devices, type Locator, type Page, webkit } from '@playwright/test'
import {
  CONSENT_COOKIE_KEY,
  CONSENT_VERSION,
  COOKIE_LOCALE_BANNER_DISMISSED_KEY
} from '~/constants/cookie'
import { SITE_URL } from '~/emails/constants'
import { APP_SCREEN_SIZE, buildAppScreenPath } from '~/helpers/web-app-assets'
import { THEME_COOKIE_KEY } from '~/lib/theme'
import { m } from '~/paraglide/messages'
import { type Locale, locales, localizeUrl } from '~/paraglide/runtime'

const SHARED_MEME_ID = 'cmko6p5pe00p30pn0lv7v37oq'
const PIXEL_RATIO = 2
const SCREEN_OUTPUT_WIDTH = 640
const HOME_OUTPUT_WIDTH = 480
const WEBP_QUALITY = 72
const SETTLE_DELAY_MS = 1500

const RECTS_FILE_PATH = path.resolve(
  'src/routes/_public__root/_default/app/-lib/app-screens.json'
)

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

const [premiumSessionToken, origin = SITE_URL] = process.argv.slice(2)

const SESSION_COOKIE_NAME = origin.startsWith('https:')
  ? '__Secure-better-auth.session_token'
  : 'better-auth.session_token'

const toRelativeRect = (rect: Rect, frame: Rect) => {
  return {
    left: (rect.x - frame.x) / frame.width,
    top: (rect.y - frame.y) / frame.height,
    width: rect.width / frame.width,
    height: rect.height / frame.height
  }
}

const readRect = async (locator: Locator) => {
  const rect = await locator.boundingBox()

  if (rect === null) {
    throw new Error(`No box for ${locator.toString()}`)
  }

  return rect
}

const writeWebp = async (image: Buffer, pathname: string, width: number) => {
  const filePath = path.resolve(`public${pathname}`)

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await sharp(image)
    .resize({ width })
    .webp({ quality: WEBP_QUALITY })
    .toFile(filePath)
  console.log(filePath)
}

const openPage = async (locale: Locale) => {
  const browser = await webkit.launch()
  const context = await browser.newContext({
    ...devices['iPhone 15 Pro'],
    viewport: APP_SCREEN_SIZE,
    deviceScaleFactor: PIXEL_RATIO,
    colorScheme: 'dark'
  })

  await context.addCookies(
    [
      [THEME_COOKIE_KEY, 'dark'],
      [COOKIE_LOCALE_BANNER_DISMISSED_KEY, '1'],
      [
        CONSENT_COOKIE_KEY,
        JSON.stringify({
          hasConsented: true,
          categories: { necessary: true, analytics: false },
          consentVersion: CONSENT_VERSION,
          lastUpdated: null
        })
      ],
      [SESSION_COOKIE_NAME, premiumSessionToken]
    ].map(([name = '', value = '']) => {
      return { name, value, url: origin }
    })
  )

  const page = await context.newPage()

  const goTo = async (pathname: string) => {
    await page.goto(localizeUrl(new URL(pathname, origin), { locale }).href, {
      waitUntil: 'networkidle'
    })
    await page.waitForTimeout(SETTLE_DELAY_MS)
  }

  return { browser, page, goTo }
}

const hideCreatorControls = async (page: Page, locale: Locale) => {
  await page
    .getByRole('link', { name: m.meme_edit_aria({}, { locale }) })
    .evaluateAll((elements) => {
      for (const element of elements) {
        element.remove()
      }
    })
}

const captureMemeScreens = async (page: Page, locale: Locale) => {
  const frame = { x: 0, y: 0, ...APP_SCREEN_SIZE }

  await hideCreatorControls(page, locale)
  const shareButton = page
    .getByRole('button', { name: m.meme_share({}, { locale }) })
    .first()
  const shareRect = toRelativeRect(await readRect(shareButton), frame)

  await writeWebp(
    await page.screenshot(),
    buildAppScreenPath(locale, 'meme'),
    SCREEN_OUTPUT_WIDTH
  )

  return { share: shareRect }
}

const captureLocale = async (locale: Locale) => {
  const { browser, page, goTo } = await openPage(locale)

  try {
    await goTo(`/memes/${SHARED_MEME_ID}`)
    const memeRects = await captureMemeScreens(page, locale)

    await goTo('/')
    await writeWebp(
      await page.screenshot(),
      buildAppScreenPath(locale, 'home'),
      HOME_OUTPUT_WIDTH
    )

    return [locale, memeRects] as const
  } finally {
    await browser.close()
  }
}

const captureAppScreens = async () => {
  if (!premiumSessionToken) {
    throw new Error(
      'Pass the session token of a Premium account: pnpm app:screens <token> [origin]. The screens show a Premium persona.'
    )
  }

  const entries = await Promise.all(locales.map(captureLocale))

  await fs.writeFile(
    RECTS_FILE_PATH,
    `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`
  )
  console.log(RECTS_FILE_PATH)
}

void captureAppScreens()
