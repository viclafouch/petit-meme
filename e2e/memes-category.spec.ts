import { NEWS_CATEGORY_SLUG } from '~/constants/meme'
import {
  E2E_CATEGORIES,
  E2E_MEMES,
  E2E_NAMED_MEMES,
  E2E_RECENT_MEMES
} from './content'
import type { E2eCategory } from './content'
import { expect, test } from './fixtures'
import { getMemeLink, getMemePlayButtons } from './library'

// A Category is open to everyone, so it is walked as an anonymous Visitor.

const CATS_CATEGORY = E2E_CATEGORIES.chats
const POLITICS_CATEGORY = E2E_CATEGORIES.politique

const countMemesOfCategory = (category: E2eCategory) => {
  return E2E_MEMES.filter((meme) => {
    return meme.categorySlugs.includes(category.slug)
  }).length
}

test('a Category shows its own Memes and nothing else', async ({ page }) => {
  const response = await page.goto(`/memes/category/${CATS_CATEGORY.slug}`)

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { name: CATS_CATEGORY.title })
  ).toBeVisible()
  await expect(getMemePlayButtons(page)).toHaveCount(
    countMemesOfCategory(CATS_CATEGORY)
  )
  await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeVisible()
  await expect(getMemeLink(page, E2E_NAMED_MEMES.english)).toBeVisible()
  // Seeded under the other Category, and its view count would otherwise put it
  // on any first page.
  await expect(
    getMemeLink(page, E2E_NAMED_MEMES.recentlyPublished)
  ).toBeHidden()
})

test('the Categories list carries the library from one Category to the other', async ({
  page
}) => {
  await page.goto(`/memes/category/${CATS_CATEGORY.slug}`)

  await page
    .getByRole('link', { name: POLITICS_CATEGORY.title, exact: true })
    .click()

  await expect(page).toHaveURL(`/memes/category/${POLITICS_CATEGORY.slug}`)
  await expect(getMemePlayButtons(page)).toHaveCount(
    countMemesOfCategory(POLITICS_CATEGORY)
  )
  await expect(
    getMemeLink(page, E2E_NAMED_MEMES.recentlyPublished)
  ).toBeVisible()
  await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
})

test('the news Category keeps what was published lately', async ({ page }) => {
  await page.goto(`/memes/category/${NEWS_CATEGORY_SLUG}`)

  await expect(getMemePlayButtons(page)).toHaveCount(E2E_RECENT_MEMES.length)

  await Promise.all(
    E2E_RECENT_MEMES.map((meme) => {
      return expect(getMemeLink(page, meme)).toBeVisible()
    })
  )

  await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeHidden()
})

test('a Category that does not exist is a not found', async ({ page }) => {
  const response = await page.goto(
    '/memes/category/aucune-categorie-ne-porte-ce-slug'
  )

  // A soft 404 would offer Google an empty page to index under a real status.
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  await expect(getMemePlayButtons(page)).toHaveCount(0)
})
