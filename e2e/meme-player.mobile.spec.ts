import { expect, type Locator, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { readVideoIsPaused } from './video'

const MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const RIGHT_OF_CENTER = { x: 0.8, y: 0.55 }

const tapAt = async (page: Page, x: number, y: number) => {
  await page.touchscreen.tap(x, y)
}

const readBox = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('The element has no box on screen')
  }

  return box
}

const expectPaused = async (video: Locator, isPaused: boolean) => {
  await expect
    .poll(() => {
      return readVideoIsPaused(video)
    })
    .toBe(isPaused)
}

test.describe('the player on a phone', () => {
  test('pauses and plays with a tap on the Video', async ({ page }) => {
    await page.goto(MEME_PATHNAME)

    const video = page
      .getByTestId('meme-video-player')
      .getByTestId('meme-video')

    await expectPaused(video, false)

    await video.tap()

    await expectPaused(video, true)

    await video.tap()

    await expectPaused(video, false)
  })

  test('answers a tap anywhere outside its controls, and only the control under the finger', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)

    const player = page.getByTestId('meme-video-player')
    const video = player.getByTestId('meme-video')
    const muteButton = player.getByRole('button', {
      name: m.meme_mute(),
      exact: true
    })
    const fullscreenButton = player.getByRole('button', {
      name: m.meme_fullscreen(),
      exact: true
    })

    await expectPaused(video, false)
    await expect(player).toHaveAttribute('userinactive')

    const muteBox = await readBox(muteButton)

    await tapAt(
      page,
      muteBox.x + muteBox.width / 2,
      muteBox.y + muteBox.height / 2
    )

    await expectPaused(video, true)
    await expect(player).toHaveAttribute('mediapaused')

    await tapAt(
      page,
      muteBox.x + muteBox.width / 2,
      muteBox.y + muteBox.height / 2
    )

    await expect(
      player.getByRole('button', { name: m.meme_unmute(), exact: true })
    ).toBeVisible()
    await expectPaused(video, true)

    const fullscreenBox = await readBox(fullscreenButton)

    await tapAt(
      page,
      fullscreenBox.x - fullscreenBox.width,
      fullscreenBox.y + fullscreenBox.height / 2
    )

    await expectPaused(video, false)

    const playerBox = await readBox(player)

    await tapAt(
      page,
      playerBox.x + playerBox.width * RIGHT_OF_CENTER.x,
      playerBox.y + playerBox.height * RIGHT_OF_CENTER.y
    )

    await expectPaused(video, true)
  })
})
