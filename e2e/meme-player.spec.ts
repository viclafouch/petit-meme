import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { test } from './fixtures'
import { getMemeList, openMemePlayer } from './library'

const LIBRARY_PATHNAME = '/memes/category/trending'

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
