import type { Page } from '@playwright/test'
import { E2E_MEMES } from './content'
import { expect, test } from './fixtures'
import { m } from './messages'

const E2E_MEME_TITLES = E2E_MEMES.map((meme) => {
  return meme.title
})

const REEL_ON_SCREEN_RATIO = 0.5

const getReels = (page: Page) => {
  return page
    .getByRole('feed', { name: m.meme_video_feed() })
    .getByRole('article')
}

test('Reels opens on a Meme', async ({ page }) => {
  const response = await page.goto('/reels')

  expect(response?.status()).toBe(200)

  const firstReel = getReels(page).first()

  await expect(firstReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
  expect(E2E_MEME_TITLES).toContain(await firstReel.getAttribute('aria-label'))
})

test('the down arrow hands Reels over to the next Meme', async ({ page }) => {
  await page.goto('/reels')

  const reels = getReels(page)
  const currentReel = reels.first()
  const nextReel = reels.nth(1)

  await expect(currentReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
  await expect(nextReel).not.toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })

  await page.keyboard.press('ArrowDown')

  await expect(nextReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
  await expect(currentReel).not.toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
})
