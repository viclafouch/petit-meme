import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { expectVisibleAfterReload, repeatUntilVisible } from './hydration'

const BOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`
const UNBOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.universal.id}`

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('bookmark') })

  test('bookmarks a Meme, finds it again after a reload, and takes it back', async ({
    page
  }) => {
    await page.goto(BOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', { name: m.meme_add_bookmark() })
    const removeButton = page.getByRole('button', {
      name: m.meme_remove_bookmark()
    })

    await repeatUntilVisible(() => {
      return addButton.click()
    }, removeButton)

    await expectVisibleAfterReload(page, removeButton)

    await repeatUntilVisible(() => {
      return removeButton.click()
    }, addButton)

    await expectVisibleAfterReload(page, addButton)
  })
})

test.describe('a User who reached the free cap', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarkCapped') })

  test('is offered Premium instead of one more Bookmark', async ({ page }) => {
    await page.goto(UNBOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', { name: m.meme_add_bookmark() })
    const dialog = page.getByRole('dialog', {
      name: m.bookmark_upsell_title()
    })

    await repeatUntilVisible(() => {
      return addButton.click()
    }, dialog)

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(addButton).toBeVisible()
  })
})

test.describe('an anonymous Visitor', () => {
  test('is asked to sign in before bookmarking', async ({ page }) => {
    await page.goto(BOOKMARKED_MEME_PATHNAME)

    const signInButton = getAuthDialogSignInButton(page)

    await repeatUntilVisible(() => {
      return page.getByRole('button', { name: m.meme_add_bookmark() }).click()
    }, signInButton)

    await expect(signInButton).toBeVisible()
  })
})
