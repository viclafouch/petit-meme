import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { NEWS_CATEGORY_SLUG } from '~/constants/meme'
import {
  E2E_CATEGORIES,
  E2E_MEMES,
  E2E_NAMED_MEMES,
  E2E_RECENT_MEMES,
  type E2eCategory
} from './content'
import { test } from './fixtures'
import { getMemeLink, getMemePlayButtons } from './library'

const CATS_CATEGORY = E2E_CATEGORIES.chats
const POLITICS_CATEGORY = E2E_CATEGORIES.politique

const CATS_CATEGORY_PATHNAME = `/memes/category/${CATS_CATEGORY.slug}`

const countMemesOfCategory = (category: E2eCategory) => {
  return E2E_MEMES.filter((meme) => {
    return meme.categorySlugs.includes(category.slug)
  }).length
}

test.describe('the Categories', () => {
  test('a Category opens on its title and holds as many Memes as it owns', async ({
    page
  }) => {
    const response = await page.goto(CATS_CATEGORY_PATHNAME)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', { name: CATS_CATEGORY.title })
    ).toBeVisible()
    await expect(getMemePlayButtons(page)).toHaveCount(
      countMemesOfCategory(CATS_CATEGORY)
    )
  })

  test('a Category shows its own Memes and nothing else', async ({ page }) => {
    await page.goto(CATS_CATEGORY_PATHNAME)

    await expect(getMemeLink(page, E2E_NAMED_MEMES.mostViewed)).toBeVisible()
    await expect(getMemeLink(page, E2E_NAMED_MEMES.english)).toBeVisible()
    await expect(
      getMemeLink(page, E2E_NAMED_MEMES.recentlyPublished)
    ).toBeHidden()
  })

  test('the Categories list carries the library from one Category to the other', async ({
    page
  }) => {
    await page.goto(CATS_CATEGORY_PATHNAME)

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

  test('the news Category keeps what was published lately', async ({
    page
  }) => {
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

    expect(response?.status()).toBe(HTTP_STATUS.NOT_FOUND)
    await expect(
      page.getByRole('heading', { name: `${HTTP_STATUS.NOT_FOUND}` })
    ).toBeVisible()
    await expect(getMemePlayButtons(page)).toHaveCount(0)
  })
})
