import { expect } from '@playwright/test'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { readVideoIsPaused } from './video'

const MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

test.describe('the player on a phone', () => {
  test('pauses and plays with a tap on the Video', async ({ page }) => {
    await page.goto(MEME_PATHNAME)

    const video = page
      .getByTestId('meme-video-player')
      .getByTestId('meme-video')

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(false)

    await video.tap()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(true)

    await video.tap()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(false)
  })
})
