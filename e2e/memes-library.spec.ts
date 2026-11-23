import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { MEMES_PER_PAGE } from '~/constants/meme'
import { m } from '~/paraglide/messages'
import {
  E2E_FIRST_PAGE_MEMES,
  E2E_MEMES,
  E2E_NAMED_MEMES,
  E2E_RECENT_MEMES,
  E2E_SECOND_PAGE_MEMES,
  E2E_UNIQUE_SEARCH_WORD
} from './content'
import { test } from './fixtures'
import { repeatUntilNavigated, repeatUntilVisible } from './hydration'
import { getMemeCardLinks, getMemeLink } from './library'

const LIBRARY_PATHNAME = '/memes/category/all'

test.describe('the library', () => {
  test('the library opens on every Meme and fills a page', async ({ page }) => {
    const response = await page.goto('/memes')

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(page).toHaveURL(LIBRARY_PATHNAME)
    await expect(
      page.getByRole('heading', { level: 1, name: m.meme_all_memes() })
    ).toBeVisible()
    await expect(getMemeCardLinks(page)).toHaveCount(MEMES_PER_PAGE)
  })

  test('a word searched from the header narrows the library to what matches', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)

    const searchField = page.getByRole('combobox', { name: m.search_label() })

    await repeatUntilNavigated(
      async () => {
        await searchField.fill(E2E_UNIQUE_SEARCH_WORD)
        await searchField.press('Enter')
      },
      { page, from: LIBRARY_PATHNAME }
    )

    await expect(page).toHaveURL(
      `${LIBRARY_PATHNAME}?query=${E2E_UNIQUE_SEARCH_WORD}`
    )
    await expect(getMemeCardLinks(page)).toHaveCount(1)
    await expect(getMemeLink(page, E2E_NAMED_MEMES.searchTarget)).toBeVisible()
    await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
  })

  test('scrolling to the end of the page appends what the first page left out', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)

    await expect(getMemeCardLinks(page)).toHaveCount(MEMES_PER_PAGE)

    const loadMoreLink = page.getByRole('link', { name: m.meme_load_more() })

    await loadMoreLink.scrollIntoViewIfNeeded()

    await expect(getMemeCardLinks(page)).toHaveCount(E2E_MEMES.length)
    await expect(loadMoreLink).toBeHidden()
    await expect(page).toHaveURL(LIBRARY_PATHNAME)
  })

  test('the second page is a page of its own for a crawler', async ({
    page
  }) => {
    const response = await page.goto(`${LIBRARY_PATHNAME}?page=2`)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(getMemeCardLinks(page)).toHaveCount(
      E2E_SECOND_PAGE_MEMES.length
    )

    await Promise.all([
      ...E2E_SECOND_PAGE_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeVisible()
      }),
      ...E2E_FIRST_PAGE_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeHidden()
      })
    ])
  })

  test('sorting by the newest leads with what was published lately', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)

    const sortGroup = page.getByRole('radiogroup', {
      name: m.meme_sort_label()
    })

    await repeatUntilVisible(
      () => {
        return sortGroup
          .getByRole('radio', { name: m.meme_sort_new(), exact: true })
          .click()
      },
      sortGroup.getByRole('radio', {
        name: m.meme_sort_new(),
        exact: true,
        checked: true
      })
    )

    await expect(page).toHaveURL(`${LIBRARY_PATHNAME}?sort=new`)
    await expect(
      getMemeLink(page, E2E_NAMED_MEMES.recentlyPublished)
    ).toBeVisible()

    const leadingTitles = await getMemeCardLinks(page).allTextContents()

    expect(
      leadingTitles.slice(0, E2E_RECENT_MEMES.length).toSorted()
    ).toStrictEqual(
      E2E_RECENT_MEMES.map((meme) => {
        return meme.title
      }).toSorted()
    )
  })

  for (const localePrefix of ['', '/en']) {
    test(`an old sorting Category leads for good to the library sorted the same way (${localePrefix || '/'})`, async ({
      request
    }) => {
      const response = await request.get(
        `${localePrefix}/memes/category/news`,
        { maxRedirects: 0 }
      )
      const location = new URL(
        response.headers().location ?? '',
        response.url()
      )

      expect(response.status()).toBe(HTTP_STATUS.PERMANENT_REDIRECT)
      expect(`${location.pathname}${location.search}`).toBe(
        `${localePrefix}${LIBRARY_PATHNAME}?sort=new`
      )
    })
  }
})
