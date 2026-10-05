import { readFileSync } from 'node:fs'
import { baseLocale, locales } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'
import { expect, test } from './fixtures'
import { localizePathname } from './urls'

const LEGAL_PATHNAMES = [
  '/dmca',
  '/mentions-legales',
  '/privacy',
  '/terms-of-use'
] as const satisfies readonly `/${string}`[]

const LEGAL_NOTICE_PATHNAME = '/mentions-legales'

const MARKDOWN_TITLE_PATTERN = /^# (.+)$/mu

const readMarkdownTitle = (
  pathname: (typeof LEGAL_PATHNAMES)[number],
  locale: Locale
) => {
  const markdown = readFileSync(`md/${locale}${pathname}.md`, 'utf8')
  const title = MARKDOWN_TITLE_PATTERN.exec(markdown)?.[1]

  if (!title) {
    throw new Error(`md/${locale}${pathname}.md carries no title.`)
  }

  return title
}

const AVATAR_STYLE_CREDIT = {
  styleName: '„Adventurer Neutral”',
  styleUrl: 'https://www.figma.com/community/file/1184595184137881796',
  author: 'Lisa Wischofsky',
  licenceName: '„CC BY 4.0”',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/'
} as const satisfies Record<string, string>

for (const locale of locales) {
  const localeName = locale === baseLocale ? `${locale}, base` : locale

  for (const pathname of LEGAL_PATHNAMES) {
    test(`${pathname} answers in its own words (${localeName})`, async ({
      page
    }) => {
      const response = await page.goto(localizePathname(pathname, locale))

      expect(response?.status()).toBe(200)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: readMarkdownTitle(pathname, locale),
          exact: true
        })
      ).toBeVisible()
    })
  }

  test(`the legal notice credits the avatar style (${localeName})`, async ({
    page
  }) => {
    await page.goto(localizePathname(LEGAL_NOTICE_PATHNAME, locale))

    await expect(
      page.getByRole('link', {
        name: AVATAR_STYLE_CREDIT.styleName,
        exact: true
      })
    ).toHaveAttribute('href', AVATAR_STYLE_CREDIT.styleUrl)
    await expect(
      page.getByRole('link', {
        name: AVATAR_STYLE_CREDIT.licenceName,
        exact: true
      })
    ).toHaveAttribute('href', AVATAR_STYLE_CREDIT.licenceUrl)
    await expect(page.getByText(AVATAR_STYLE_CREDIT.author)).toBeVisible()
  })
}
