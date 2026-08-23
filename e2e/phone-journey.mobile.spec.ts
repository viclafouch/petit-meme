import { E2E_NAMED_MEMES } from './content'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getMemePlayButtons } from './library'
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

  const playerDialog = page.getByRole('dialog')

  await repeatUntilVisible(() => {
    return getMemePlayButtons(page).first().click()
  }, playerDialog)

  await expect(
    playerDialog.getByRole('button', { name: m.meme_share_video() })
  ).toBeVisible()
  await expect(playerDialog.locator('media-controller')).toBeVisible()
})

test('a Meme page plays its Video on Safari', async ({ page }) => {
  await page.goto(PLAYABLE_MEME_PATHNAME)

  const video = page.locator('media-controller video')

  await expect
    .poll(() => {
      return video.evaluate((element: HTMLVideoElement) => {
        return element.currentTime
      })
    })
    .toBeGreaterThan(0)
})
