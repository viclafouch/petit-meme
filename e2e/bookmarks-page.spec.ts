import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { getMemeLink, getMemePlayLinks } from './library'

const BOOKMARKED_MEMES = [E2E_NAMED_MEMES.english, E2E_NAMED_MEMES.universal]

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarks') })

  test('finds every Meme they bookmarked and nothing else', async ({
    page
  }) => {
    const response = await page.goto('/bookmarks')

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', { name: m.settings_bookmarks_heading() })
    ).toBeVisible()
    await expect(getMemePlayLinks(page)).toHaveCount(BOOKMARKED_MEMES.length)

    await Promise.all(
      BOOKMARKED_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeVisible()
      })
    )

    await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
  })
})

test.describe('an anonymous Visitor', () => {
  test('is sent back to the library', async ({ page }) => {
    await page.goto('/bookmarks')

    await expect(page).toHaveURL('/memes/category/trending')
  })
})
