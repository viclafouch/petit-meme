import { E2E_NAMED_MEMES } from './content'
import { E2E_BUNNY_HOSTNAME } from './env'
import { expect, test } from './fixtures'
import { m } from './messages'

const PLAYABLE_MEME = E2E_NAMED_MEMES.mostViewed
const PLAYABLE_MEME_PATHNAME = `/memes/${PLAYABLE_MEME.id}`
const PLAYABLE_MEME_POSTER_URL = `https://${E2E_BUNNY_HOSTNAME}/${PLAYABLE_MEME.bunnyId}/thumbnail.jpg`
const AUDIO_LANGUAGE_LABEL = m.meme_audio_language({
  language: m.meme_content_locale_FR()
})

test('a Meme page opens on its title, its description and its language', async ({
  page
}) => {
  const response = await page.goto(PLAYABLE_MEME_PATHNAME)

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: PLAYABLE_MEME.title,
      exact: true
    })
  ).toBeVisible()
  await expect(page.getByText(PLAYABLE_MEME.description)).toBeVisible()
  await expect(page.getByLabel(AUDIO_LANGUAGE_LABEL)).toBeVisible()
})

test('a Meme page hands back to the library', async ({ page }) => {
  await page.goto(PLAYABLE_MEME_PATHNAME)

  await page.getByRole('link', { name: m.meme_back_to_memes() }).click()

  await expect(page).toHaveURL('/memes/category/trending')
})

test('the player carries the Video of the Meme and plays it on its own', async ({
  page
}) => {
  await page.goto(PLAYABLE_MEME_PATHNAME)

  const player = page.locator('media-controller')
  const video = player.locator('video')

  await expect(video).toHaveAttribute('poster', PLAYABLE_MEME_POSTER_URL)
  await expect(
    player.getByRole('button', { name: m.meme_pause_video(), exact: true })
  ).toBeVisible()
  await expect
    .poll(() => {
      return video.evaluate((element: HTMLVideoElement) => {
        return element.currentTime
      })
    })
    .toBeGreaterThan(0)
})
