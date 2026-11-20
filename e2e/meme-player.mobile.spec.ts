import { expect, type Locator, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { readVideoIsPaused, readVideoIsMuted } from './video'

const MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const RIGHT_OF_CENTER = { x: 0.8, y: 0.55 }

const readBox = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('The element has no box on screen')
  }

  return box
}

const tapCenterOf = async (page: Page, locator: Locator) => {
  const box = await readBox(locator)

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
}

const tapRightOfCenter = async (page: Page, player: Locator) => {
  const box = await readBox(player)

  await page.touchscreen.tap(
    box.x + box.width * RIGHT_OF_CENTER.x,
    box.y + box.height * RIGHT_OF_CENTER.y
  )
}

const expectPaused = async (video: Locator, isPaused: boolean) => {
  await expect
    .poll(() => {
      return readVideoIsPaused(video)
    })
    .toBe(isPaused)
}

const expectShown = async (centerButton: Locator, isShown: boolean) => {
  await expect(centerButton).toHaveCSS('opacity', isShown ? '1' : '0')
}

const getPlayer = (page: Page) => {
  const player = page.getByTestId('meme-video-player')

  return {
    player,
    video: player.getByTestId('meme-video'),
    pauseButton: player.getByRole('button', {
      name: m.meme_pause_video(),
      exact: true
    }),
    playButton: player.getByRole('button', {
      name: m.meme_play_video(),
      exact: true
    }),
    muteButton: player.getByRole('button', {
      name: m.meme_mute(),
      exact: true
    })
  }
}

test.describe('the player on a phone', () => {
  test('a tap on the Video shows the controls, and another hides them, without pausing', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)

    const { player, video, pauseButton } = getPlayer(page)

    await expectPaused(video, false)
    await expectShown(pauseButton, false)

    await tapRightOfCenter(page, player)

    await expectShown(pauseButton, true)
    await expectPaused(video, false)

    await tapRightOfCenter(page, player)

    await expectShown(pauseButton, false)
    await expectPaused(video, false)
  })

  test('pauses and plays from the button in the middle, the only play button', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)

    const { player, video, pauseButton, playButton } = getPlayer(page)

    await expectPaused(video, false)
    await expect(pauseButton).toHaveCount(1)

    await tapRightOfCenter(page, player)
    await expectShown(pauseButton, true)
    await tapCenterOf(page, pauseButton)

    await expectPaused(video, true)
    await expectShown(playButton, true)

    await tapCenterOf(page, playButton)

    await expectPaused(video, false)
  })

  test('a tap over a hidden control only shows the controls', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)

    const { video, pauseButton, muteButton } = getPlayer(page)

    await expectPaused(video, false)
    await expectShown(pauseButton, false)

    await tapCenterOf(page, muteButton)

    await expectShown(pauseButton, true)
    await expectPaused(video, false)
    await expect
      .poll(() => {
        return readVideoIsMuted(video)
      })
      .toBe(false)
  })
})
