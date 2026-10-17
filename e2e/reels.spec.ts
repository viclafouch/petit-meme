import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { E2E_MEMES } from './content'
import { test } from './fixtures'
import { getReelAt } from './library'

const E2E_MEME_TITLES = E2E_MEMES.map((meme) => {
  return meme.title
})

const REEL_ON_SCREEN_RATIO = 0.5
const FIRST_REEL_INDEX = 0
const NEXT_REEL_INDEX = 1

test.describe('the Reels', () => {
  test('opens on a Meme', async ({ page }) => {
    const response = await page.goto('/reels')

    expect(response?.status()).toBe(HTTP_STATUS.OK)

    const firstReel = getReelAt(page, FIRST_REEL_INDEX)

    await expect(firstReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
    expect(E2E_MEME_TITLES).toContain(
      await firstReel.getAttribute('aria-label')
    )
  })

  test('the down arrow hands over to the next Meme', async ({ page }) => {
    await page.goto('/reels')

    const currentReel = getReelAt(page, FIRST_REEL_INDEX)
    const nextReel = getReelAt(page, NEXT_REEL_INDEX)

    await expect(currentReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
    await expect(nextReel).not.toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })

    await page.keyboard.press('ArrowDown')

    await expect(nextReel).toBeInViewport({ ratio: REEL_ON_SCREEN_RATIO })
    await expect(currentReel).not.toBeInViewport({
      ratio: REEL_ON_SCREEN_RATIO
    })
  })
})
