import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { E2E_NAMED_MEMES, E2E_UNIQUE_SEARCH_WORD } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'

test.use({ storageState: resolveStorageStatePath('free') })

test.describe('the seed', () => {
  test('a signed in Visitor lands on the home page', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('the seeded Memes reach the library', async ({ page }) => {
    await page.goto('/memes/category/trending')

    await expect(
      page.getByRole('link', { name: E2E_NAMED_MEMES.mostViewed.title })
    ).toBeVisible()
  })

  test('the seeded Memes reach the search index', async ({ page }) => {
    const search = new URLSearchParams({ query: E2E_UNIQUE_SEARCH_WORD })

    await page.goto(`/memes/category/all?${search}`)

    await expect(
      page.getByRole('link', { name: E2E_NAMED_MEMES.searchTarget.title })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: E2E_NAMED_MEMES.mostViewed.title })
    ).toBeHidden()
  })
})
