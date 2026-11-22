import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { m } from '~/paraglide/messages'
import { E2E_CATEGORIES, E2E_NAMED_MEMES } from './content'
import { E2E_BUNNY_IMAGES_HOSTNAME } from './env'
import { test } from './fixtures'
import { readVideoCurrentTime } from './video'

const PLAYABLE_MEME = E2E_NAMED_MEMES.mostViewed
const PLAYABLE_MEME_CATEGORY = E2E_CATEGORIES.chats
const PLAYABLE_MEME_KEYWORD = 'cookie'
const PLAYABLE_MEME_PATHNAME = `/memes/${PLAYABLE_MEME.id}`
const PLAYABLE_MEME_POSTER_URL = `https://${E2E_BUNNY_IMAGES_HOSTNAME}/${PLAYABLE_MEME.bunnyId}/first-frame.webp`
const AUDIO_LANGUAGE_LABEL = m.meme_audio_language({
  language: m.meme_content_locale_FR()
})

test.describe('a Meme page', () => {
  test('opens on its title, its description and its language', async ({
    page
  }) => {
    const response = await page.goto(PLAYABLE_MEME_PATHNAME)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: PLAYABLE_MEME.title,
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByText(PLAYABLE_MEME.description)).toBeVisible()
    await expect(
      page.getByText(AUDIO_LANGUAGE_LABEL, { exact: true })
    ).toBeVisible()
  })

  test('a category of the Meme opens its category page', async ({ page }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    await page
      .getByRole('list', { name: m.meme_categories_label() })
      .getByRole('link', { name: PLAYABLE_MEME_CATEGORY.title, exact: true })
      .click()

    await expect(page).toHaveURL(
      `/memes/category/${PLAYABLE_MEME_CATEGORY.slug}`
    )
  })

  test('a keyword of the Meme searches the library for it', async ({
    page
  }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    await page
      .getByRole('list', { name: m.meme_related_searches() })
      .getByRole('link', { name: PLAYABLE_MEME_KEYWORD, exact: true })
      .click()

    await expect(page).toHaveURL(
      `/memes/category/all?query=${PLAYABLE_MEME_KEYWORD}`
    )
  })

  test('the player carries the Video of the Meme and plays it on its own', async ({
    page
  }) => {
    await page.goto(PLAYABLE_MEME_PATHNAME)

    const player = page.getByTestId('meme-video-player')
    const video = player.getByTestId('meme-video')

    await expect(player.getByTestId('meme-poster')).toHaveAttribute(
      'src',
      PLAYABLE_MEME_POSTER_URL
    )
    await expect(
      player.getByRole('button', { name: m.meme_pause_video(), exact: true })
    ).toBeVisible()
    await expect
      .poll(() => {
        return readVideoCurrentTime(video)
      })
      .toBeGreaterThan(0)
  })
})
