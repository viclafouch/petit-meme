import { expect, test } from './fixtures'
import { getMemeList, openMemePlayer } from './library'
import { m } from './messages'

// The player is not a Radix dialog, so nothing puts the rest of the page out of
// reach on its own. `inert` is the whole of it, and it is what the assertions
// read: a focus trap keeps the Tab key inside and leaves the library announced,
// clickable and swipeable to everyone who is not tabbing.

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

// Escape is handled by the player alone. The library used to answer it too, on
// a path that closed the player without handing focus back.
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
