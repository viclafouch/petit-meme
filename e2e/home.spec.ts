import { TRENDING_MEMES_COUNT } from '~/constants/meme'
import { E2E_RECENT_MEMES } from './content'
import { expect, test } from './fixtures'
import { getMemePlayButtons } from './library'
import { m } from './messages'

// The home page belongs to everyone, so it is walked as an anonymous Visitor:
// nothing here is supposed to ask for an account.

test('the home page opens on Memes', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(m.home_best_subtitle())).toBeVisible()
  await expect(getMemePlayButtons(page)).toHaveCount(TRENDING_MEMES_COUNT)
})

test('the hero leads to the library and to the plans', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: m.home_hero_cta_discover() }).click()

  await expect(page).toHaveURL('/memes/category/trending')

  await page.goBack()
  await page.getByRole('link', { name: m.home_hero_cta_premium() }).click()

  await expect(page).toHaveURL('/pricing')
})

test('the Memes section hands over to the whole library', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: m.home_best_browse_all() }).click()

  await expect(page).toHaveURL('/memes/category/trending')
  await expect(getMemePlayButtons(page).first()).toBeVisible()
})

test('the announcement counts what was published lately and leads to it', async ({
  page
}) => {
  await page.goto('/')

  // `exact` carries the whole assertion. A name is compared by substring by
  // default, so a count of fifty three would answer for a count of three.
  const announcement = page.getByRole('link', {
    name: m.home_hero_announcement({ count: String(E2E_RECENT_MEMES.length) }),
    exact: true
  })

  await expect(announcement).toBeVisible()
  await announcement.click()

  await expect(page).toHaveURL('/memes/category/news')
})
