import type { Page } from '@playwright/test'
import type { Locale } from '~/paraglide/runtime'
import type { E2eMeme } from './content'
import { repeatUntilVisible } from './hydration'
import { E2E_LOCALE } from './locales'
import { m } from './messages'

// Every Meme card carries exactly one play button and nothing else on the page
// does, so counting them counts the Memes on screen. The titles cannot serve
// here: a card holds several links to the same Meme.
export const getMemePlayButtons = (page: Page, locale: Locale = E2E_LOCALE) => {
  return page.getByRole('button', { name: m.meme_play_video({}, { locale }) })
}

// `exact` is what makes the match mean something. A name is compared by
// substring by default, and the filler titles differ by a number, so the
// thirty first would answer for the third.
export const getMemeLink = (page: Page, meme: E2eMeme) => {
  return page.getByRole('link', { name: meme.title, exact: true })
}

export const getMemeList = (page: Page) => {
  return page.getByRole('list', { name: m.meme_list_label(), exact: true })
}

export const getMemeTitleLinks = (page: Page) => {
  return getMemeList(page).getByRole('link')
}

// The click is the first one of a freshly loaded page every time this helper is
// called, so it carries the repeat that hydration asks for.
export const openMemePlayer = async (page: Page) => {
  const playerDialog = page.getByRole('dialog')

  await repeatUntilVisible(() => {
    return getMemePlayButtons(page).first().click()
  }, playerDialog)

  return playerDialog
}

export const getReels = (page: Page) => {
  return page
    .getByRole('feed', { name: m.meme_video_feed() })
    .getByRole('article')
}
