import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getFirstMemePlayButton, openMemePlayer } from './library'

const PLAYABLE_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

test.describe('the phone journey', () => {
  test('the tab bar is the way to the library on a phone', async ({ page }) => {
    await page.goto('/')

    const tabBar = page.getByTestId('tab-bar')
    const memesLink = tabBar.getByRole('link', {
      name: m.nav_memes(),
      exact: true
    })

    await expect(
      tabBar.getByRole('link', { name: m.nav_home(), exact: true })
    ).toHaveAttribute('aria-current', 'page')

    await memesLink.click()

    await expect(page).toHaveURL('/memes/category/trending')
    await expect(memesLink).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('contentinfo')).toBeHidden()
  })

  test('the Reels tab opens the feed, and the tab bar leads back out', async ({
    page
  }) => {
    await page.goto('/')

    const tabBar = page.getByTestId('tab-bar')
    const reelsLink = tabBar.getByRole('link', {
      name: m.nav_reels(),
      exact: true
    })

    await reelsLink.click()

    await expect(page).toHaveURL('/reels')
    await expect(reelsLink).toHaveAttribute('aria-current', 'page')
    await expect(
      page.getByRole('feed', { name: m.meme_video_feed() })
    ).toBeVisible()

    await tabBar.getByRole('link', { name: m.nav_home(), exact: true }).click()

    await expect(page).toHaveURL('/')
  })

  test('the search tab finds a Meme by its title', async ({ page }) => {
    await page.goto('/')

    const searchDrawer = page.getByRole('dialog', { name: m.nav_search() })

    await repeatUntilVisible(() => {
      return page
        .getByTestId('tab-bar')
        .getByRole('button', { name: m.nav_search(), exact: true })
        .click()
    }, searchDrawer)

    await searchDrawer
      .getByRole('searchbox', { name: m.nav_search() })
      .fill('cookie')
    await searchDrawer
      .getByRole('link', { name: E2E_NAMED_MEMES.mostViewed.title })
      .click()

    await expect(page).toHaveURL(PLAYABLE_MEME_PATHNAME)
    await expect(searchDrawer).toBeHidden()
  })

  test('a Visitor signs in from the account tab', async ({ page }) => {
    await page.goto('/')

    const accountDrawer = page.getByRole('dialog', { name: m.nav_account() })

    await repeatUntilVisible(() => {
      return page
        .getByTestId('tab-bar')
        .getByRole('button', { name: m.nav_account(), exact: true })
        .click()
    }, accountDrawer)

    await expect(
      accountDrawer
        .getByRole('navigation', { name: m.nav_legal() })
        .getByRole('link', { name: m.footer_privacy() })
    ).toBeVisible()

    await accountDrawer
      .getByRole('button', { name: m.nav_sign_in(), exact: true })
      .click()

    await expect(accountDrawer).toBeHidden()
    await expect(page.getByRole('dialog').getByRole('tabpanel')).toBeVisible()
  })

  test('a tap on a Meme of the home page opens the player', async ({
    page
  }) => {
    await page.goto('/')

    const playerDialog = await openMemePlayer(page)

    await expect(
      playerDialog.getByRole('button', { name: m.meme_share(), exact: true })
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

test.describe('the phone journey of a User', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('a User reaches the settings from the account tab', async ({ page }) => {
    await page.goto('/')

    const accountTab = page
      .getByTestId('tab-bar')
      .getByRole('button', { name: m.nav_account(), exact: true })
    const accountDrawer = page.getByRole('dialog', { name: m.nav_account() })

    await repeatUntilVisible(() => {
      return accountTab.click()
    }, accountDrawer)

    await accountDrawer
      .getByRole('link', { name: m.nav_settings(), exact: true })
      .click()

    await expect(page).toHaveURL('/settings')
    await expect(accountDrawer).toBeHidden()
    await expect(accountTab).toHaveAttribute('data-current', '')
  })
})
