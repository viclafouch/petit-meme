import { expect, test } from './fixtures'
import { getMemeList, openMemePlayer } from './library'
import { m } from './messages'

const LIBRARY_PATHNAME = '/memes/category/trending'

test('the player puts the library out of reach and gives it back', async ({
  page
}) => {
  await page.goto(LIBRARY_PATHNAME)

  const memeList = getMemeList(page)

  await expect(memeList).not.toHaveAttribute('inert')

  const playerDialog = await openMemePlayer(page)

  await expect(memeList).toHaveAttribute('inert')

  await playerDialog.getByRole('button', { name: m.common_close() }).click()

  await expect(playerDialog).toBeHidden()
  await expect(memeList).not.toHaveAttribute('inert')
})

test('escape closes the player and gives the library back', async ({
  page
}) => {
  await page.goto(LIBRARY_PATHNAME)

  const memeList = getMemeList(page)
  const playerDialog = await openMemePlayer(page)

  await page.keyboard.press('Escape')

  await expect(playerDialog).toBeHidden()
  await expect(memeList).not.toHaveAttribute('inert')
})
