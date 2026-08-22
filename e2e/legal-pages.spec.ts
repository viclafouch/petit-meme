import { readFileSync } from 'node:fs'
import { baseLocale, locales } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'
import { expect, test } from './fixtures'
import { localizePathname } from './urls'

// Legal pages are open to everyone, so they are walked as an anonymous
// Visitor. Their body is markdown, one file per locale, and the route picks
// the file from the locale of the URL.

const LEGAL_PATHNAMES = [
  '/dmca',
  '/mentions-legales',
  '/privacy',
  '/terms-of-use'
] as const satisfies readonly `/${string}`[]

const LEGAL_NOTICE_PATHNAME = '/mentions-legales'

const MARKDOWN_TITLE_PATTERN = /^# (.+)$/mu

// The expected heading is read from the very file the page serves, because the
// failure to catch here is a locale serving the other one's markdown. A copy
// kept in this file would still be green that day, since both copies would
// name the same page.
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

// The avatar style is a remix used under CC BY 4.0, and that licence holds
// only as long as the credit and its two links stay on the page. This is the
// one assertion of the suite whose value is a legal obligation rather than a
// product choice, so it is written here rather than read from the markdown.
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
