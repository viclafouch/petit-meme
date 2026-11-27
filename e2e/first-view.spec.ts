import { expect, type Page, type Response } from '@playwright/test'
import {
  formatKb,
  matchIsOverBudget,
  readBundleBudget,
  readStartupHrefs,
  toBrotliSize
} from '../scripts/lib/bundle-size'
import { E2E_NAMED_MEMES } from './content'
import { test } from './fixtures'

const FIRST_VIEW_PAGES = [
  { route: '/', url: '/' },
  { route: '/memes/category/$slug', url: '/memes/category/all' },
  {
    route: '/memes/$memeId',
    url: `/memes/${E2E_NAMED_MEMES.mostViewed.id}`
  },
  { route: '/pricing', url: '/pricing' },
  { route: '/app', url: '/app' }
] as const

const BUDGET = readBundleBudget()

const STARTUP_HREFS = await readStartupHrefs()

const SERVER_RENDERED_SCRIPT_SELECTOR =
  'link[rel="modulepreload"][href], script[type="module"][src]'

const measureFirstView = async (page: Page, url: string) => {
  const stylesheetByUrl = new Map<string, Response>()

  page.on('response', (response) => {
    if (response.request().resourceType() === 'stylesheet') {
      stylesheetByUrl.set(response.url(), response)
    }
  })

  const navigation = await page.goto(url)
  const html = (await navigation?.text()) ?? ''

  const serverRenderedScripts = await page.evaluate(
    ({ documentHtml, selector }) => {
      const parsedDocument = new DOMParser().parseFromString(
        documentHtml,
        'text/html'
      )

      return [...parsedDocument.querySelectorAll(selector)].map(
        ({ attributes }) => {
          return (
            attributes.getNamedItem('href')?.value ??
            attributes.getNamedItem('src')?.value ??
            ''
          )
        }
      )
    },
    { documentHtml: html, selector: SERVER_RENDERED_SCRIPT_SELECTOR }
  )

  const cssSizes = await Promise.all(
    [...stylesheetByUrl.values()].map(async (stylesheet) => {
      return toBrotliSize(await stylesheet.body())
    })
  )

  return {
    serverRenderedScripts: new Set(serverRenderedScripts),
    cssBytes: cssSizes.reduce((total, size) => {
      return total + size
    }, 0)
  }
}

test.describe('the first view', () => {
  for (const { route, url } of FIRST_VIEW_PAGES) {
    test(`${route} preloads what the bundle-size report counts, and keeps its CSS within budget`, async ({
      page
    }) => {
      const { serverRenderedScripts, cssBytes } = await measureFirstView(
        page,
        url
      )
      const cssBudgetKb = BUDGET.firstViewCss[route]

      expect(
        serverRenderedScripts,
        `${route} server-renders other scripts than the TanStack Start manifest lists, so \`pnpm run bundle-size\` measures the wrong files`
      ).toStrictEqual(
        new Set([
          ...STARTUP_HREFS.shell,
          ...(STARTUP_HREFS.routes[route] ?? [])
        ])
      )
      expect(
        cssBudgetKb,
        `${route} has no first-view CSS budget in bundle-budget.json`
      ).toBeDefined()
      expect(
        matchIsOverBudget(cssBytes, cssBudgetKb ?? 0),
        `${route} loads ${formatKb(cssBytes)} of CSS on its first view, over its ${cssBudgetKb} kB budget in bundle-budget.json`
      ).toBe(false)
    })
  }
})
