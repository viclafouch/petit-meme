import { E2E_NAMED_MEMES } from './content'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getMemePlayButtons, openMemePlayer } from './library'
import { m } from './messages'

const PLAYABLE_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

test('the burger menu is the way to the library on a phone', async ({
  page
}) => {
  await page.goto('/')

  const mobileNav = page.locator('[data-mobile-nav]')
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

test('a tap on a Meme of the home page opens the player', async ({ page }) => {
  await page.goto('/')

  const playerDialog = await openMemePlayer(page)

  await expect(
    playerDialog.getByRole('button', { name: m.meme_share_video() })
  ).toBeVisible()
  await expect(playerDialog.locator('media-controller')).toBeVisible()
})

// Safari does not focus a button when it is tapped, so the player has nothing
// to fall back on: the card it was opened from is handed to it, and handing it
// back is the only thing that keeps a VoiceOver cursor where the Visitor left
// it. On Chrome the tap focuses the card by itself and this proves nothing.
test('closing the player hands focus back to the card it came from', async ({
  page
}) => {
  await page.goto('/')

  const playButton = getMemePlayButtons(page).first()
  const playerDialog = await openMemePlayer(page)

  await playerDialog.getByRole('button', { name: m.common_close() }).click()

  await expect(playerDialog).toBeHidden()
  await expect(playButton).toBeFocused()
})

// What is asserted is the stream reaching WebKit, never the video starting on
// its own: Safari refuses an unmuted autoplay, and Playwright allows it, so a
// running video would prove the runner and not the phone.
test('a Meme page loads its Video on Safari', async ({ page }) => {
  await page.goto(PLAYABLE_MEME_PATHNAME)

  const video = page.locator('media-controller video')

  await expect
    .poll(() => {
      return video.evaluate((element: HTMLVideoElement) => {
        return element.duration
      })
    })
    .toBeGreaterThan(0)
})
