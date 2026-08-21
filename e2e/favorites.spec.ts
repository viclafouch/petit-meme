import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { getMemeLink, getMemePlayButtons } from './library'
import { m } from './messages'

const BOOKMARKED_MEMES = [E2E_NAMED_MEMES.english, E2E_NAMED_MEMES.universal]

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('favorites') })

  test('finds every Meme they bookmarked and nothing else', async ({
    page
  }) => {
    const response = await page.goto('/favorites')

    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { name: m.settings_favorites_heading() })
    ).toBeVisible()
    await expect(getMemePlayButtons(page)).toHaveCount(BOOKMARKED_MEMES.length)

    await Promise.all(
      BOOKMARKED_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeVisible()
      })
    )

    await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
  })
})

test('an anonymous Visitor is sent back to the library', async ({ page }) => {
  await page.goto('/favorites')

  await expect(page).toHaveURL('/memes/category/trending')
})
