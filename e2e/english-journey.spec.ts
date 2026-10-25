import { expect, type Page } from '@playwright/test'
import { COOKIE_LOCALE_BANNER_DISMISSED_KEY } from '~/constants/cookie'
import { HTTP_STATUS } from '~/constants/http'
import { MEMES_PER_PAGE, TRENDING_CATEGORY_SLUG } from '~/constants/meme'
import { PREMIUM_PLAN_PRICING } from '~/constants/plan'
import { MONTHS_IN_YEAR } from '~/constants/time'
import { getLocaleDisplayName } from '~/helpers/locale'
import { formatCentsToEuros } from '~/helpers/number'
import { buildPageTitle, buildUrl, OG_LOCALE_MAP } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { baseLocale, cookieName, type Locale } from '~/paraglide/runtime'
import {
  expectActiveSubscription,
  payWithTestCard,
  startCheckout
} from './checkout-flow'
import { E2E_ROLES } from './constants'
import {
  E2E_CATEGORIES,
  E2E_ENGLISH_FIRST_PAGE_MEMES,
  E2E_ENGLISH_SECOND_PAGE_MEMES,
  E2E_NAMED_MEMES,
  getE2eCategoryTitle,
  localizeE2eMeme
} from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getMemeLink, getMemePlayButtons } from './library'
import { E2E_ENGLISH_LOCALE } from './locales'
import { localizePathname } from './urls'

const IN_ENGLISH = { locale: E2E_ENGLISH_LOCALE } as const satisfies {
  locale: Locale
}

const FRENCH_TRENDING_PATHNAME = `/memes/category/${TRENDING_CATEGORY_SLUG}`

const ENGLISH_TRENDING_PATHNAME = localizePathname(
  FRENCH_TRENDING_PATHNAME,
  E2E_ENGLISH_LOCALE
)

const ENGLISH_HOME_PATHNAME = localizePathname('/', E2E_ENGLISH_LOCALE)

const ENGLISH_LIBRARY_PATHNAME = localizePathname('/memes', E2E_ENGLISH_LOCALE)

const ENGLISH_PRICING_PATHNAME = localizePathname(
  '/pricing',
  E2E_ENGLISH_LOCALE
)

const ENGLISH_CHECKOUT_SUCCESS_PATHNAME = localizePathname(
  '/checkout/success',
  E2E_ENGLISH_LOCALE
)

const UNIVERSAL_MEME_IN_ENGLISH = localizeE2eMeme(
  E2E_NAMED_MEMES.universal,
  E2E_ENGLISH_LOCALE
)
const UNIVERSAL_MEME_IN_FRENCH = E2E_NAMED_MEMES.universal
const FRENCH_ONLY_MEME = E2E_NAMED_MEMES.mostViewed

const SECOND_PAGE_NUMBER = '2'

const DEFAULT_HREFLANG = 'x-default'

type DocumentAttributeQuery = {
  selector: string
  attribute: string
}

const readDocumentAttributes = (page: Page, query: DocumentAttributeQuery) => {
  return page.evaluate(({ selector, attribute }) => {
    return [...document.querySelectorAll(selector)].map((element) => {
      return element.getAttribute(attribute)
    })
  }, query)
}

const readDocumentLanguage = (page: Page) => {
  return readDocumentAttributes(page, { selector: 'html', attribute: 'lang' })
}

const readAlternateHrefs = (page: Page, hreflang: string) => {
  return readDocumentAttributes(page, {
    selector: `link[rel="alternate"][hreflang="${hreflang}"]`,
    attribute: 'href'
  })
}

const readOpenGraphContents = (page: Page, property: string) => {
  return readDocumentAttributes(page, {
    selector: `meta[property="${property}"]`,
    attribute: 'content'
  })
}

const readLocaleMetadata = async (page: Page) => {
  return {
    canonical: await readDocumentAttributes(page, {
      selector: 'link[rel="canonical"]',
      attribute: 'href'
    }),
    englishAlternate: await readAlternateHrefs(page, E2E_ENGLISH_LOCALE),
    frenchAlternate: await readAlternateHrefs(page, baseLocale),
    defaultAlternate: await readAlternateHrefs(page, DEFAULT_HREFLANG),
    ogLocale: await readOpenGraphContents(page, 'og:locale'),
    ogLocaleAlternate: await readOpenGraphContents(page, 'og:locale:alternate')
  }
}

type EnglishPage = {
  name: string
  pathname: string
  title: string
}

const ENGLISH_PAGES = [
  {
    name: 'home',
    pathname: '/',
    title: m.seo_home_title({}, IN_ENGLISH)
  },
  {
    name: 'library',
    pathname: '/memes/category/all',
    title: m.meme_seo_library_title({}, IN_ENGLISH)
  },
  {
    name: 'Category',
    pathname: `/memes/category/${E2E_CATEGORIES.chats.slug}`,
    title: m.meme_seo_category_title(
      {
        title: getE2eCategoryTitle(E2E_CATEGORIES.chats, E2E_ENGLISH_LOCALE)
      },
      IN_ENGLISH
    )
  },
  {
    name: 'Meme',
    pathname: `/memes/${UNIVERSAL_MEME_IN_ENGLISH.id}`,
    title: UNIVERSAL_MEME_IN_ENGLISH.title
  },
  {
    name: 'plans',
    pathname: '/pricing',
    title: m.seo_pricing_title({}, IN_ENGLISH)
  },
  {
    name: 'AiSearch',
    pathname: '/memes/ai-search',
    title: m.ai_search_seo_title({}, IN_ENGLISH)
  },
  {
    name: 'Submission',
    pathname: '/submit',
    title: m.submit_heading({}, IN_ENGLISH)
  },
  {
    name: 'reels',
    pathname: '/reels',
    title: m.seo_reels_title({}, IN_ENGLISH)
  }
] as const satisfies readonly EnglishPage[]

test.describe('the English journey', () => {
  test('the English home answers in English and keeps the road under /en/', async ({
    page
  }) => {
    const response = await page.goto(ENGLISH_HOME_PATHNAME)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect
      .poll(() => {
        return readDocumentLanguage(page)
      })
      .toStrictEqual([E2E_ENGLISH_LOCALE])
    await expect(
      page.getByText(m.home_best_subtitle({}, IN_ENGLISH))
    ).toBeVisible()

    await page
      .getByRole('link', { name: m.home_hero_cta_discover({}, IN_ENGLISH) })
      .click()

    await expect(page).toHaveURL(ENGLISH_TRENDING_PATHNAME)
  })

  test('the English library opens on the trending Category and fills a page', async ({
    page
  }) => {
    const response = await page.goto(ENGLISH_LIBRARY_PATHNAME)

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(page).toHaveURL(ENGLISH_TRENDING_PATHNAME)
    await expect(
      page.getByRole('heading', {
        name: m.meme_category_trending({}, IN_ENGLISH)
      })
    ).toBeVisible()
    await expect(getMemePlayButtons(page, E2E_ENGLISH_LOCALE)).toHaveCount(
      MEMES_PER_PAGE
    )
  })

  test('the English library holds what English can watch, and nothing else', async ({
    page
  }) => {
    await page.goto(ENGLISH_LIBRARY_PATHNAME)

    await expect(getMemeLink(page, UNIVERSAL_MEME_IN_ENGLISH)).toBeVisible()
    await expect(getMemeLink(page, UNIVERSAL_MEME_IN_FRENCH)).toBeHidden()
    await expect(getMemeLink(page, FRENCH_ONLY_MEME)).toBeHidden()
  })

  test('the second English page holds exactly what the first one left out', async ({
    page
  }) => {
    await page.goto(ENGLISH_TRENDING_PATHNAME)

    await expect(getMemeLink(page, UNIVERSAL_MEME_IN_ENGLISH)).toBeVisible()

    await page
      .getByRole('navigation', { name: m.common_pagination({}, IN_ENGLISH) })
      .getByRole('link', { name: SECOND_PAGE_NUMBER, exact: true })
      .click()

    await expect(page).toHaveURL(
      `${ENGLISH_TRENDING_PATHNAME}?page=${SECOND_PAGE_NUMBER}`
    )
    await expect(getMemePlayButtons(page, E2E_ENGLISH_LOCALE)).toHaveCount(
      E2E_ENGLISH_SECOND_PAGE_MEMES.length
    )

    await Promise.all([
      ...E2E_ENGLISH_SECOND_PAGE_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeVisible()
      }),
      ...E2E_ENGLISH_FIRST_PAGE_MEMES.map((meme) => {
        return expect(getMemeLink(page, meme)).toBeHidden()
      })
    ])
  })

  test('a Meme page speaks the language of the URL it was asked for', async ({
    page
  }) => {
    const response = await page.goto(
      localizePathname(
        `/memes/${UNIVERSAL_MEME_IN_ENGLISH.id}`,
        E2E_ENGLISH_LOCALE
      )
    )

    expect(response?.status()).toBe(HTTP_STATUS.OK)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: UNIVERSAL_MEME_IN_ENGLISH.title,
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText(UNIVERSAL_MEME_IN_ENGLISH.description)
    ).toBeVisible()
  })

  for (const englishPage of ENGLISH_PAGES) {
    test(`the ${englishPage.name} page carries its English metadata`, async ({
      page
    }) => {
      await page.goto(
        localizePathname(englishPage.pathname, E2E_ENGLISH_LOCALE)
      )

      const englishUrl = buildUrl(englishPage.pathname, E2E_ENGLISH_LOCALE)
      const frenchUrl = buildUrl(englishPage.pathname, baseLocale)

      await expect(page).toHaveTitle(buildPageTitle(englishPage.title))
      await expect
        .poll(() => {
          return readLocaleMetadata(page)
        })
        .toStrictEqual({
          canonical: [englishUrl],
          englishAlternate: [englishUrl],
          frenchAlternate: [frenchUrl],
          defaultAlternate: [frenchUrl],
          ogLocale: [OG_LOCALE_MAP[E2E_ENGLISH_LOCALE]],
          ogLocaleAlternate: [OG_LOCALE_MAP[baseLocale]]
        })
    })
  }

  test('the language switcher moves the page, and the choice outranks the URL', async ({
    page
  }) => {
    await page.goto(FRENCH_TRENDING_PATHNAME)

    const englishOption = page.getByRole('menuitem', {
      name: getLocaleDisplayName(E2E_ENGLISH_LOCALE, E2E_ENGLISH_LOCALE),
      exact: true
    })

    await repeatUntilVisible(() => {
      return page
        .getByRole('banner')
        .getByRole('button', { name: m.nav_switch_language() })
        .click()
    }, englishOption)

    await englishOption.click()

    await expect(page).toHaveURL(ENGLISH_TRENDING_PATHNAME)
    await expect(
      page.getByRole('heading', {
        name: m.meme_category_trending({}, IN_ENGLISH)
      })
    ).toBeVisible()

    await page.goto(FRENCH_TRENDING_PATHNAME)

    await expect(page).toHaveURL(ENGLISH_TRENDING_PATHNAME)
  })

  test('an English page offers the browser its own language', async ({
    page,
    context
  }) => {
    await context.clearCookies({ name: COOKIE_LOCALE_BANNER_DISMISSED_KEY })

    await page.goto(ENGLISH_HOME_PATHNAME)

    const frenchName = getLocaleDisplayName(baseLocale, E2E_ENGLISH_LOCALE)

    await expect(
      page.getByText(
        m.locale_banner_available({ language: frenchName }, IN_ENGLISH)
      )
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: m.locale_banner_switch({ language: frenchName }, IN_ENGLISH)
      })
      .click()

    await expect(page).toHaveURL('/')
    await expect
      .poll(() => {
        return readDocumentLanguage(page)
      })
      .toStrictEqual([baseLocale])
  })

  test('an English page keeps its language when the locale cookie changes before it hydrates', async ({
    page,
    context
  }) => {
    await context.clearCookies({ name: COOKIE_LOCALE_BANNER_DISMISSED_KEY })
    await page.addInitScript(
      ({ name, value }) => {
        document.cookie = `${name}=${value}; path=/`
      },
      { name: cookieName, value: baseLocale }
    )

    await page.goto(ENGLISH_HOME_PATHNAME)

    const frenchName = getLocaleDisplayName(baseLocale, E2E_ENGLISH_LOCALE)

    await expect(
      page.getByText(
        m.locale_banner_available({ language: frenchName }, IN_ENGLISH)
      )
    ).toBeVisible()
    await expect(
      page.getByText(m.home_best_subtitle({}, IN_ENGLISH))
    ).toBeVisible()
  })

  test('an English landing keeps English for the next visit', async ({
    page
  }) => {
    await page.goto(ENGLISH_HOME_PATHNAME)

    await page.goto('/')

    await expect(page).toHaveURL(ENGLISH_HOME_PATHNAME)
  })

  test.describe('an English checkout', () => {
    test.use({ storageState: resolveStorageStatePath('checkoutEnglish') })

    test('sells the annual plan in English and lands the Visitor back', async ({
      page
    }) => {
      await page.goto(ENGLISH_PRICING_PATHNAME)

      await expect(
        page.getByRole('heading', {
          level: 1,
          name: m.pricing_heading({}, IN_ENGLISH)
        })
      ).toBeVisible()

      const yearlyOption = page.getByRole('radio', {
        name: m.pricing_yearly({}, IN_ENGLISH)
      })

      await repeatUntilVisible(
        () => {
          return yearlyOption.click()
        },
        page.getByRole('radio', {
          name: m.pricing_yearly({}, IN_ENGLISH),
          checked: true
        })
      )

      const monthlyBreakdownInEnglish = formatCentsToEuros(
        Math.round(PREMIUM_PLAN_PRICING.yearly.priceInCents / MONTHS_IN_YEAR),
        { locale: E2E_ENGLISH_LOCALE, minimumFractionDigits: 2 }
      )

      await expect(
        page.getByText(
          m.pricing_yearly_breakdown(
            { price: monthlyBreakdownInEnglish },
            IN_ENGLISH
          )
        )
      ).toBeVisible()

      await startCheckout(page, E2E_ENGLISH_LOCALE)
      await payWithTestCard(page, E2E_ROLES.checkoutEnglish.name)

      await expectActiveSubscription(E2E_ROLES.checkoutEnglish.id)

      await expect(page).toHaveURL(ENGLISH_CHECKOUT_SUCCESS_PATHNAME)
      await expect
        .poll(() => {
          return readDocumentLanguage(page)
        })
        .toStrictEqual([E2E_ENGLISH_LOCALE])

      await page.goto(ENGLISH_PRICING_PATHNAME)

      await expect(
        page.getByRole('button', {
          name: m.pricing_active_plan_sr({}, IN_ENGLISH)
        })
      ).toBeVisible()
    })
  })
})
