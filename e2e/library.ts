import type { Page } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import type { Locale } from '~/paraglide/runtime'
import type { E2eMeme } from './content'
import { repeatUntilVisible } from './hydration'
import { E2E_LOCALE } from './locales'

export const getMemePlayButtons = (page: Page, locale: Locale = E2E_LOCALE) => {
  return page.getByRole('button', {
    name: m.meme_play_video({}, { locale })
  })
}

export const getMemeLink = (page: Page, meme: E2eMeme) => {
  return page.getByRole('link', { name: meme.title, exact: true })
}

export const getMemeList = (page: Page) => {
  return page.getByRole('list', { name: m.meme_list_label(), exact: true })
}

export const getMemeTitleLinks = (page: Page) => {
  return getMemeList(page).getByRole('link')
}

export const getFirstMemePlayButton = (page: Page) => {
  // oxlint-disable-next-line playwright/no-nth-methods -- any Meme of the list will do: the first one is the one a Visitor reaches first
  return getMemePlayButtons(page).first()
}

export const openMemePlayer = async (page: Page) => {
  const playerDialog = page.getByRole('dialog')

  await repeatUntilVisible(() => {
    return getFirstMemePlayButton(page).click()
  }, playerDialog)

  return playerDialog
}

const getReels = (page: Page) => {
  return page
    .getByRole('feed', { name: m.meme_video_feed() })
    .getByRole('article')
}

export const getReelAt = (page: Page, index: number) => {
  // oxlint-disable-next-line playwright/no-nth-methods -- Reels is a feed: the order of its articles is the behaviour under test
  return getReels(page).nth(index)
}
