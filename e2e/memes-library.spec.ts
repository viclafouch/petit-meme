import { MEMES_PER_PAGE } from '~/constants/meme'
import {
  E2E_FIRST_PAGE_MEMES,
  E2E_NAMED_MEMES,
  E2E_SEARCH_WORD,
  E2E_SECOND_PAGE_MEMES
} from './content'
import { expect, test } from './fixtures'
import { repeatUntilNavigated, repeatUntilVisible } from './hydration'
import { getMemeLink, getMemePlayButtons, getMemeTitleLinks } from './library'
import { m } from './messages'

// The library is open to everyone, so it is walked as an anonymous Visitor.

const LIBRARY_PATHNAME = '/memes/category/all'

const SECOND_PAGE_NUMBER = '2'

const WIDEST_GRID_COLUMN_COUNT = '6'

// Dropping French leaves the English and the Universal Memes, thirty four of
// them, so the page stays full. A filter that answered nothing would satisfy
// every other assertion of that test.
const FILTERED_FIRST_PAGE_COUNT = MEMES_PER_PAGE

test('the library opens on the trending Category and fills a page', async ({
  page
}) => {
  const response = await page.goto('/memes')

  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL('/memes/category/trending')
  await expect(
    page.getByRole('heading', { name: m.meme_category_trending() })
  ).toBeVisible()
  await expect(getMemePlayButtons(page)).toHaveCount(MEMES_PER_PAGE)
})

test('a word typed in the search field narrows the library to what matches', async ({
  page
}) => {
  await page.goto(LIBRARY_PATHNAME)

  const searchField = page.getByRole('searchbox', {
    name: m.meme_search_placeholder()
  })

  // The searched Meme is the second most viewed, so the unfiltered page already
  // carries it and waiting for it proves nothing. The query reaching the URL is
  // what says the word was typed into a live page, and the field is emptied
  // first so that a repeat has a change to fire.
  await repeatUntilNavigated(
    async () => {
      await searchField.clear()
      await searchField.fill(E2E_SEARCH_WORD)
    },
    { page, from: LIBRARY_PATHNAME }
  )

  await expect(getMemePlayButtons(page)).toHaveCount(1)
  await expect(getMemeLink(page, E2E_NAMED_MEMES.searchTarget)).toBeVisible()
  await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
})

test('the second page holds exactly what the first one left out', async ({
  page
}) => {
  await page.goto('/memes/category/trending')

  await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeVisible()

  await page
    .getByRole('navigation', { name: m.common_pagination() })
    .getByRole('link', { name: SECOND_PAGE_NUMBER, exact: true })
    .click()

  await expect(page).toHaveURL(
    `/memes/category/trending?page=${SECOND_PAGE_NUMBER}`
  )
  await expect(getMemePlayButtons(page)).toHaveCount(
    E2E_SECOND_PAGE_MEMES.length
  )

  // The count alone would hold for any twenty three Memes. Naming both sides of
  // the cut is what proves the cut sits where the page size says.
  await Promise.all([
    ...E2E_SECOND_PAGE_MEMES.map((meme) => {
      return expect(getMemeLink(page, meme)).toBeVisible()
    }),
    ...E2E_FIRST_PAGE_MEMES.map((meme) => {
      return expect(getMemeLink(page, meme)).toBeHidden()
    })
  ])
})

test('widening the grid changes neither the Memes nor their order', async ({
  page
}) => {
  await page.goto('/memes/category/trending')

  const memeTitleLinks = getMemeTitleLinks(page)

  await expect(memeTitleLinks).toHaveCount(MEMES_PER_PAGE)

  const titlesBeforeWidening = await memeTitleLinks.allTextContents()

  const gridColumns = page.getByRole('radiogroup', {
    name: m.meme_grid_columns()
  })
  const widestGrid = gridColumns.getByRole('radio', {
    name: WIDEST_GRID_COLUMN_COUNT,
    exact: true
  })

  await repeatUntilVisible(
    () => {
      return widestGrid.click()
    },
    gridColumns.getByRole('radio', {
      name: WIDEST_GRID_COLUMN_COUNT,
      exact: true,
      checked: true
    })
  )

  await expect(memeTitleLinks).toHaveText(titlesBeforeWidening)
})

test('dropping French from the filter leaves the rest of the library', async ({
  page
}) => {
  await page.goto('/memes/category/trending')

  const frenchCheckbox = page.getByRole('checkbox', {
    name: m.meme_content_locale_FR()
  })

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.meme_filter_languages() }).click()
  }, frenchCheckbox)

  await frenchCheckbox.uncheck()

  await expect(
    getMemeLink(page, E2E_NAMED_MEMES.recentlyPublished)
  ).toBeHidden()
  await expect(getMemeLink(page, E2E_NAMED_MEMES.english)).toBeVisible()
  await expect(getMemePlayButtons(page)).toHaveCount(FILTERED_FIRST_PAGE_COUNT)
})
