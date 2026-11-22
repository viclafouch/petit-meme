import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { expectVisibleAfterReload, repeatUntilVisible } from './hydration'

const BOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`
const UNBOOKMARKED_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.universal.id}`

const TOGGLED_FROM_CARD_MEME = E2E_NAMED_MEMES.english

const CARD_MENU_TOGGLE_COUNT = 4

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('bookmark') })

  test('bookmarks a Meme, finds it again after a reload, and takes it back', async ({
    page
  }) => {
    await page.goto(BOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', {
      name: m.meme_bookmark(),
      pressed: false
    })
    const removeButton = page.getByRole('button', {
      name: m.meme_bookmarked(),
      pressed: true
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

  test('toggles a Bookmark from a card menu as often as they like, and the menu stays open', async ({
    page
  }) => {
    let settledToggleCount = 0

    page.on('response', (response) => {
      const request = response.request()

      if (
        request.method() === 'POST' &&
        (request.postData() ?? '').includes(TOGGLED_FROM_CARD_MEME.id)
      ) {
        settledToggleCount += 1
      }
    })

    await page.goto('/memes/category/all')

    const optionsButton = page.getByRole('button', {
      name: m.meme_open_options_named({ title: TOGGLED_FROM_CARD_MEME.title })
    })
    const menu = page.getByRole('menu')
    const addItem = menu.getByRole('menuitem', { name: m.meme_add_bookmark() })
    const removeItem = menu.getByRole('menuitem', {
      name: m.meme_remove_bookmark()
    })

    await repeatUntilVisible(() => {
      return optionsButton.click()
    }, addItem)

    await addItem.click()
    await expect(removeItem).toBeVisible()

    await removeItem.click()
    await expect(addItem).toBeVisible()

    await addItem.click()
    await expect(removeItem).toBeVisible()

    await removeItem.click()
    await expect(addItem).toBeVisible()

    await expect
      .poll(() => {
        return settledToggleCount
      })
      .toBe(CARD_MENU_TOGGLE_COUNT)

    await page.reload()

    await repeatUntilVisible(() => {
      return optionsButton.click()
    }, addItem)
  })
})

test.describe('a User who reached the free cap', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarkCapped') })

  test('is offered Premium instead of one more Bookmark', async ({ page }) => {
    await page.goto(UNBOOKMARKED_MEME_PATHNAME)

    const addButton = page.getByRole('button', { name: m.meme_bookmark() })
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
      return page.getByRole('button', { name: m.meme_bookmark() }).click()
    }, signInButton)

    await expect(signInButton).toBeVisible()
  })
})
