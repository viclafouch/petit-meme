import type { Response } from '@playwright/test'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

const BOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`
const UNBOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.universal.id}`
const SERVER_FUNCTION_BASE = '/_serverFn/'

const matchIsServerFunctionCall = (response: Response) => {
  return (
    response.request().method() === 'POST' &&
    response.url().includes(SERVER_FUNCTION_BASE)
  )
}

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('bookmark') })

  test('bookmarks a Meme, finds it again after a reload, and takes it back', async ({
    page
  }) => {
    await page.goto(BOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', { name: m.meme_add_favorite() })
    const removeButton = page.getByRole('button', {
      name: m.meme_remove_favorite()
    })

    const bookmarkWritten = page.waitForResponse(matchIsServerFunctionCall)

    await repeatUntilVisible(() => {
      return addButton.click()
    }, removeButton)

    await bookmarkWritten
    await page.reload()

    await expect(removeButton).toBeVisible()

    const bookmarkRemoved = page.waitForResponse(matchIsServerFunctionCall)

    await removeButton.click()

    await bookmarkRemoved
    await page.reload()

    await expect(addButton).toBeVisible()
  })
})

test.describe('a User who reached the free cap', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarkCapped') })

  test('is refused one more Bookmark and told so', async ({ page }) => {
    await page.goto(UNBOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', { name: m.meme_add_favorite() })

    await repeatUntilVisible(() => {
      return addButton.click()
    }, page.getByText(m.error_bookmark_update()))

    await expect(addButton).toBeVisible()
  })
})

test('an anonymous Visitor is asked to sign in before bookmarking', async ({
  page
}) => {
  await page.goto(BOOKMARKED_MEME_PATHNAME)

  const signInButton = getAuthDialogSignInButton(page)

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.meme_add_favorite() }).click()
  }, signInButton)

  await expect(signInButton).toBeVisible()
})
