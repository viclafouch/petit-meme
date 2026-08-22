import type { Page } from '@playwright/test'
import { E2E_MEMES, E2E_NAMED_MEMES } from './content'
import { expect, test } from './fixtures'
import { repeatUntilNavigated } from './hydration'
import { m } from './messages'

const E2E_MEME_TITLES = E2E_MEMES.map((meme) => {
  return meme.title
})

const SHUFFLE_SOURCE_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const MEME_PAGE_URL_PATTERN = /\/memes\/[^/]+$/u

const expectSeededMemePage = async (page: Page) => {
  await expect(page).toHaveURL(MEME_PAGE_URL_PATTERN)

  const memeTitle = page.getByRole('heading', { level: 1 })

  await expect(memeTitle).toBeVisible()
  expect(E2E_MEME_TITLES).toContain(await memeTitle.textContent())
}

test('a draw lands on a Meme page', async ({ page }) => {
  await page.goto('/random')

  await expectSeededMemePage(page)
})

test('a Meme page hands over to another Meme', async ({ page }) => {
  await page.goto(SHUFFLE_SOURCE_PATHNAME)

  await repeatUntilNavigated(
    () => {
      return page.getByRole('button', { name: m.meme_random() }).click()
    },
    { page, from: SHUFFLE_SOURCE_PATHNAME }
  )

  await expectSeededMemePage(page)
})
