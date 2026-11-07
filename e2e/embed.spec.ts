import { expect } from '@playwright/test'
import { CONSENT_BANNER_DELAY_MS, CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { HTTP_STATUS } from '~/constants/http'
import { m } from '~/paraglide/messages.js'
import type { Locale } from '~/paraglide/runtime'
import { E2E_NAMED_MEMES } from './content'
import { E2E_BASE_URL } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { E2E_ENGLISH_LOCALE } from './locales'

const PLAYABLE_MEME = E2E_NAMED_MEMES.mostViewed
const EMBED_PATHNAME = `/embed/${PLAYABLE_MEME.id}`
const IN_ENGLISH = { locale: E2E_ENGLISH_LOCALE } as const satisfies {
  locale: Locale
}
const BANNER_GRACE_MS = 1000

test.describe('the embed player', () => {
  test('lets any site frame it and stays out of the index', async ({
    request
  }) => {
    const response = await request.get(EMBED_PATHNAME)
    const html = await response.text()

    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()['content-security-policy']).toBe(
      'frame-ancestors *'
    )
    expect(html).toMatch(/<meta name="robots" content="noindex"/u)
    expect(html).not.toContain('index,follow')
  })

  test('plays the Video of the Meme', async ({ page }) => {
    await page.goto(EMBED_PATHNAME)

    const video = page.getByTestId('meme-video')

    await repeatUntilVisible(
      () => {
        return page
          .getByRole('button', { name: m.meme_play_video(), exact: true })
          .click()
      },
      page.getByRole('button', { name: m.meme_pause_video(), exact: true })
    )
    await expect
      .poll(() => {
        return video.evaluate((element: HTMLVideoElement) => {
          return element.currentTime
        })
      })
      .toBeGreaterThan(0)
  })

  test('leads back to the Meme page in a new tab', async ({ page }) => {
    await page.goto(EMBED_PATHNAME)

    const memeLink = page.getByRole('link', { name: m.embed_watch_on_site() })

    await expect(memeLink).toHaveAttribute('href', `/memes/${PLAYABLE_MEME.id}`)
    await expect(memeLink).toHaveAttribute('target', '_blank')
  })

  test('speaks English under /en', async ({ page }) => {
    await page.goto(`/${E2E_ENGLISH_LOCALE}${EMBED_PATHNAME}`)

    await expect(
      page.getByRole('link', { name: m.embed_watch_on_site({}, IN_ENGLISH) })
    ).toBeVisible()
  })

  test('never shows the consent banner over the Video', async ({ page }) => {
    await page.context().clearCookies({ name: CONSENT_COOKIE_KEY })
    await page.clock.install()
    await page.goto(EMBED_PATHNAME)

    await repeatUntilVisible(
      () => {
        return page
          .getByRole('button', { name: m.meme_play_video(), exact: true })
          .click()
      },
      page.getByRole('button', { name: m.meme_pause_video(), exact: true })
    )
    await page.clock.runFor(CONSENT_BANNER_DELAY_MS + BANNER_GRACE_MS)
    await expect(
      page.getByRole('dialog', { name: m.cookie_title(), exact: true })
    ).toHaveCount(0)
  })

  test('is the player the video sitemap hands to search engines', async ({
    request
  }) => {
    const response = await request.get('/sitemap-memes.xml')
    const body = await response.text()

    expect(body).toContain(
      `<video:player_loc>${E2E_BASE_URL}${EMBED_PATHNAME}</video:player_loc>`
    )
    expect(body).not.toContain('<video:content_loc>')
  })
})
