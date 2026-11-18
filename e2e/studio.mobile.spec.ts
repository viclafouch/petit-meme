import { expect, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'

const STUDIO_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}/studio`

const getStudio = (page: Page) => {
  return page.getByRole('dialog', { name: /Studio/u })
}

const getLooks = (page: Page) => {
  return getStudio(page).getByRole('radiogroup', {
    name: m.studio_looks_label()
  })
}

test.describe('an anonymous Visitor on a phone', () => {
  test('shares from the sheet, with the download beside it', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    const actions = getStudio(page).getByRole('button', {
      name: m.meme_download(),
      exact: true
    })

    await expect(
      getStudio(page).getByRole('button', { name: m.meme_share() })
    ).toBeVisible()
    await expect(actions).toHaveCount(1)
    await expect(actions).toBeVisible()
  })

  test('types in the band, with the styles out of the way until done', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    const topField = getStudio(page).getByRole('textbox', {
      name: m.studio_add_top()
    })
    const doneButton = getStudio(page).getByRole('button', {
      name: m.studio_keyboard_done()
    })

    await repeatUntilVisible(() => {
      return topField.click()
    }, doneButton)

    await expect(getLooks(page)).toBeHidden()

    await page.keyboard.type('Moi lundi matin')
    await doneButton.click()

    await expect(topField).not.toBeFocused()
    await expect(getLooks(page)).toBeVisible()

    await getStudio(page)
      .getByRole('button', { name: m.studio_add_bottom() })
      .click()

    await expect(
      getStudio(page).getByRole('textbox', { name: m.studio_add_bottom() })
    ).toBeFocused()
  })
})
