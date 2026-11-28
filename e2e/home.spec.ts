import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { TRENDING_MEMES_COUNT } from '~/constants/meme'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { HOME_TRENDING_COUNT } from '~/routes/_public__root/-lib/home'
import { E2E_RECENT_MEMES } from './content'
import { test } from './fixtures'
import { getFirstMemeCardLink, getMemeCardLinks } from './library'

test.describe('the home page', () => {
  test('opens on Memes', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: m.home_trending_title() })
    ).toBeVisible()
    await expect(getMemeCardLinks(page)).toHaveCount(
      Math.min(TRENDING_MEMES_COUNT, HOME_TRENDING_COUNT)
    )
  })

  test('the hero leads to the library and to the plans', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: m.home_hero_cta_discover() }).click()

    await expect(page).toHaveURL('/memes/category/all')

    await page.goBack()
    await page.getByRole('link', { name: m.home_hero_cta_premium() }).click()

    await expect(page).toHaveURL('/pricing')
  })

  test('the trending section hands over to the whole library', async ({
    page
  }) => {
    await page.goto('/')

    const [libraryLabelStart, libraryLabelEnd] = m
      .home_trending_all({ count: 2, formattedCount: '\u0000' })
      .split('\u0000')

    await page
      .getByRole('link', {
        name: new RegExp(`^${libraryLabelStart}.+${libraryLabelEnd}$`, 'u')
      })
      .filter({ visible: true })
      .click()

    await expect(page).toHaveURL('/memes/category/all?sort=trending')
    await expect(getFirstMemeCardLink(page)).toBeVisible()
  })

  test('the announcement counts what was published lately and leads to it', async ({
    page
  }) => {
    await page.goto('/')

    const count = E2E_RECENT_MEMES.length
    const formattedCount = formatCount(count, 'fr', 'standard')
    const announcement = page.getByRole('link', {
      name: `${m.home_hero_new_memes({ count, formattedCount })} ${m.home_hero_new_memes_added({ count, formattedCount })}`,
      exact: true
    })

    await expect(announcement).toBeVisible()
    await announcement.click()

    await expect(page).toHaveURL('/memes/category/all?sort=new')
  })
})
