import { expect, type Page } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { FREE_CAPS } from '~/helpers/cap'
import { m } from '~/paraglide/messages'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { expectVisibleAfterReload, repeatUntilVisible } from './hydration'

const BOOKMARKS_PATHNAME = '/memes/bookmarks'

const REMOVED_MEME = E2E_NAMED_MEMES.english

const BOOKMARKED_MEMES = [REMOVED_MEME, E2E_NAMED_MEMES.universal]

const getBookmarkList = (page: Page) => {
  return page.getByRole('list', { name: m.nav_my_bookmarks(), exact: true })
}

test.describe('a signed in User', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarks') })

  test('finds every Meme they bookmarked in the library, and nothing else', async ({
    page
  }) => {
    const response = await page.goto(BOOKMARKS_PATHNAME)
    const bookmarkList = getBookmarkList(page)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', { level: 1, name: m.nav_my_bookmarks() })
    ).toBeVisible()
    await expect(bookmarkList.getByRole('article')).toHaveCount(
      BOOKMARKED_MEMES.length
    )

    await Promise.all(
      BOOKMARKED_MEMES.map((meme) => {
        return expect(
          bookmarkList.getByRole('link', { name: meme.title, exact: true })
        ).toBeVisible()
      })
    )

    await expect(
      bookmarkList.getByRole('link', {
        name: E2E_NAMED_MEMES.mostViewed.title,
        exact: true
      })
    ).toBeHidden()
  })

  test('unstars a Meme in place, with no notification, and finds it gone on the next visit', async ({
    page
  }) => {
    await page.goto(BOOKMARKS_PATHNAME)

    const meme = REMOVED_MEME
    const bookmarkList = getBookmarkList(page)
    const memeLink = bookmarkList.getByRole('link', {
      name: meme.title,
      exact: true
    })
    const starButton = (isPressed: boolean) => {
      return bookmarkList.getByRole('button', {
        name: m.bookmark_card_label({ title: meme.title }),
        pressed: isPressed
      })
    }
    const remainingCount = page.getByText(
      m.meme_library_count({ count: 1, formattedCount: '1' })
    )

    await repeatUntilVisible(() => {
      return starButton(true).click()
    }, starButton(false))

    await expect(memeLink).toBeVisible()
    await expect(bookmarkList.getByRole('article')).toHaveCount(
      BOOKMARKED_MEMES.length
    )
    await expect(
      page.getByRole('region', { name: /Notifications/u }).getByRole('listitem')
    ).toHaveCount(0)

    await expectVisibleAfterReload(page, remainingCount)
    await expect(memeLink).toBeHidden()

    await page.goto(`/memes/${meme.id}`)

    const bookmarkedButton = page.getByRole('button', {
      name: m.meme_bookmarked(),
      pressed: true
    })

    await repeatUntilVisible(() => {
      return page
        .getByRole('button', { name: m.meme_bookmark(), pressed: false })
        .click()
    }, bookmarkedButton)
    await expectVisibleAfterReload(page, bookmarkedButton)

    await page.goto(BOOKMARKS_PATHNAME)
    await expect(memeLink).toBeVisible()
  })
})

test.describe('a User who reached the free cap', () => {
  test.use({ storageState: resolveStorageStatePath('bookmarkCapped') })

  test('is told on their bookmarks that Premium keeps more', async ({
    page
  }) => {
    await page.goto(BOOKMARKS_PATHNAME)

    const capNotice = page.getByRole('complementary', {
      name: m.bookmark_cap_reached_title({ cap: FREE_CAPS.bookmark })
    })

    await expect(capNotice).toBeVisible()
    await expect(
      capNotice.getByRole('link', { name: m.nav_upgrade_premium() })
    ).toHaveAttribute('href', '/pricing')
  })
})

test.describe('an anonymous Visitor', () => {
  test('learns what a bookmark is for, and is asked to sign in to keep one', async ({
    page
  }) => {
    const response = await page.goto(BOOKMARKS_PATHNAME)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', { name: m.bookmark_intro_title() })
    ).toBeVisible()

    await repeatUntilVisible(() => {
      return page
        .getByRole('button', { name: m.bookmark_intro_sign_in() })
        .click()
    }, getAuthDialogSignInButton(page))
  })

  for (const localePrefix of ['', '/en']) {
    test(`an old bookmarks address leads for good to the library (${localePrefix || '/'})`, async ({
      request
    }) => {
      const response = await request.get(`${localePrefix}/bookmarks`, {
        maxRedirects: 0
      })
      const location = new URL(
        response.headers().location ?? '',
        response.url()
      )

      expect(response.status()).toBe(HTTP_STATUS.PERMANENT_REDIRECT)
      expect(location.pathname).toBe(`${localePrefix}${BOOKMARKS_PATHNAME}`)
    })
  }
})
