import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { repeatUntilNavigated } from './hydration'
import { getFirstMemeCardLink } from './library'
import { readVideoIsPaused } from './video'

const LIBRARY_PATHNAME = '/memes/category/all'
const PLAYABLE_MEME = E2E_NAMED_MEMES.mostViewed
const PLAYABLE_MEME_PATHNAME = `/memes/${PLAYABLE_MEME.id}`

test.describe('the player', () => {
  test('a Meme of the library opens on its own page', async ({ page }) => {
    await page.goto(LIBRARY_PATHNAME)

    const playLink = getFirstMemeCardLink(page)
    const memePathname = await playLink.getAttribute('href')

    await repeatUntilNavigated(
      () => {
        return playLink.click()
      },
      { page, from: LIBRARY_PATHNAME }
    )

    await expect(page).toHaveURL(memePathname ?? '')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a similar Meme opens on its own page', async ({ page }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const firstRelatedMeme = page
      .getByRole('complementary', { name: m.meme_related() })
      .getByRole('link')
      // oxlint-disable-next-line playwright/no-nth-methods -- the rail order is Algolia's: the first similar Meme is the one a Visitor reaches first
      .first()

    await expect(firstRelatedMeme).toBeVisible()

    await repeatUntilNavigated(
      () => {
        return firstRelatedMeme.click()
      },
      { page, from: PLAYABLE_MEME_PATHNAME }
    )

    await expect(page).toHaveURL(/\/memes\/[^/]+$/u)
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
      PLAYABLE_MEME.title
    )
  })

  test('pauses and plays the Video from its controls', async ({ page }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const player = page.getByTestId('meme-video-player')
    const video = player.getByTestId('meme-video')
    const pauseButton = player.getByRole('button', {
      name: m.meme_pause_video(),
      exact: true
    })

    await expect(pauseButton).toBeVisible()
    await player.hover()
    await pauseButton.click()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(true)

    await player.hover()
    await player
      .getByRole('button', { name: m.meme_play_video(), exact: true })
      .click()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(false)
  })

  test('a click on the Video pauses and plays it', async ({ page }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const video = page
      .getByTestId('meme-video-player')
      .getByTestId('meme-video')

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(false)

    await video.click()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(true)

    await video.click()

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(false)
  })

  test('shows the controls of a paused Video only under the mouse, with nothing in the middle', async ({
    page
  }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const player = page.getByTestId('meme-video-player')
    const pauseButton = player.getByRole('button', {
      name: m.meme_pause_video(),
      exact: true
    })
    const playButton = player.getByRole('button', {
      name: m.meme_play_video(),
      exact: true
    })
    const readControlsOpacity = () => {
      return playButton.evaluate((button) => {
        const controls = button.closest('.meme-player-chrome')

        return controls ? getComputedStyle(controls).opacity : null
      })
    }

    await expect(pauseButton).toBeVisible()
    await player.hover()
    await pauseButton.click()

    await expect(playButton).toHaveCount(1)
    await expect.poll(readControlsOpacity).toBe('1')

    await page.mouse.move(0, 0)

    await expect.poll(readControlsOpacity).toBe('0')

    await player.hover()

    await expect.poll(readControlsOpacity).toBe('1')
  })
})
