import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { getMemeList, openMemePlayer } from './library'

const LIBRARY_PATHNAME = '/memes/category/trending'
const PLAYABLE_MEME = E2E_NAMED_MEMES.mostViewed

test.describe('the player', () => {
  test('puts the library out of reach and gives it back', async ({ page }) => {
    await page.goto(LIBRARY_PATHNAME)

    const memeList = getMemeList(page)

    await expect(memeList).toBeVisible()

    const playerDialog = await openMemePlayer(page)

    await expect(memeList).toHaveCount(0)

    await playerDialog.getByRole('button', { name: m.common_close() }).click()

    await expect(playerDialog).toBeHidden()
    await expect(memeList).toBeVisible()
  })

  test('plays the Video of the Meme on its own', async ({ page }) => {
    await page.goto(LIBRARY_PATHNAME)

    const playerDialog = await openMemePlayer(page)
    const video = playerDialog.getByTestId('meme-video')

    await expect(
      playerDialog.getByRole('heading', {
        name: PLAYABLE_MEME.title,
        exact: true
      })
    ).toBeVisible()
    await expect
      .poll(() => {
        return video.evaluate((element: HTMLVideoElement) => {
          return element.currentTime
        })
      })
      .toBeGreaterThan(0)
  })

  test('escape closes the player and gives the library back', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)

    const memeList = getMemeList(page)
    const playerDialog = await openMemePlayer(page)

    await page.keyboard.press('Escape')

    await expect(playerDialog).toBeHidden()
    await expect(memeList).toBeVisible()
  })
})
