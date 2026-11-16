import type { Page } from '@playwright/test'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import type { E2eMeme } from './content'
import { E2E_LOCALE } from './locales'

const TITLE_SLOT = '\u0000'

export const buildNamedMemeActionPattern = (
  message: (inputs: { title: string }) => string
) => {
  const [prefix = ''] = message({ title: TITLE_SLOT }).split(TITLE_SLOT)

  return new RegExp(`^${RegExp.escape(prefix)}`, 'u')
}

export const getMemePlayLinks = (page: Page, locale: Locale = E2E_LOCALE) => {
  return page.getByRole('link', {
    name: buildNamedMemeActionPattern((inputs) => {
      return m.meme_play_video_named(inputs, { locale })
    })
  })
}

export const getMemeLink = (page: Page, meme: E2eMeme) => {
  return page.getByRole('link', { name: meme.title, exact: true })
}

export const getMemeList = (page: Page) => {
  return page.getByRole('list', { name: m.meme_list_label(), exact: true })
}

export const getMemeTitleLinks = (page: Page) => {
  return getMemeList(page)
    .getByRole('link')
    .filter({
      hasNotText: buildNamedMemeActionPattern(m.meme_play_video_named)
    })
}

export const getFirstMemePlayLink = (page: Page) => {
  // oxlint-disable-next-line playwright/no-nth-methods -- any Meme of the list will do: the first one is the one a Visitor reaches first
  return getMemePlayLinks(page).first()
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
