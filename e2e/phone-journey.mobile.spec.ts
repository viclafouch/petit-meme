import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getFirstMemePlayButton, openMemePlayer } from './library'

const PLAYABLE_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

test.describe('the phone journey', () => {
  test('the burger menu is the way to the library on a phone', async ({
    page
  }) => {
    await page.goto('/')

    const mobileNav = page.getByTestId('mobile-nav')
    const memesLink = mobileNav.getByRole('link', {
      name: m.nav_memes(),
      exact: true
    })

    await repeatUntilVisible(() => {
      return page.getByRole('button', { name: m.nav_toggle_menu() }).click()
    }, memesLink)

    await memesLink.click()

    await expect(page).toHaveURL('/memes/category/trending')
    await expect(mobileNav).toBeHidden()
  })

  test('a tap on a Meme of the home page opens the player', async ({
    page
  }) => {
    await page.goto('/')

    const playerDialog = await openMemePlayer(page)

    await expect(
      playerDialog.getByRole('button', { name: m.meme_share_video() })
    ).toBeVisible()
    await expect(playerDialog.getByTestId('meme-video-player')).toBeVisible()
  })

  test('closing the player hands focus back to the card it came from', async ({
    page
  }) => {
    await page.goto('/')

    const playButton = getFirstMemePlayButton(page)
    const playerDialog = await openMemePlayer(page)

    await playerDialog.getByRole('button', { name: m.common_close() }).click()

    await expect(playerDialog).toBeHidden()
    await expect(playButton).toBeFocused()
  })

  test('a Meme page loads its Video on Safari', async ({ page }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const video = page.getByTestId('meme-video')

    await expect
      .poll(() => {
        return video.evaluate((element: HTMLVideoElement) => {
          return element.duration
        })
      })
      .toBeGreaterThan(0)
  })
})
