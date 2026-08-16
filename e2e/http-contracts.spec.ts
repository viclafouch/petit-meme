import { expect, test } from '@playwright/test'
import { E2E_BASE_URL, E2E_BUNNY_HOSTNAME } from './env'

// No browser here: these routes answer machines, not Visitors.
type ChildSitemap = {
  pathname: string
  // Says out loud which sitemaps are still empty. An empty sitemap makes the
  // leak assertion below pass without covering anything, and seeding content
  // is what flips these to true.
  hasEntries: boolean
}

const CHILD_SITEMAPS = [
  { pathname: '/sitemap-static.xml', hasEntries: true },
  // Carries `trending` and `all` even with no Category in the database.
  { pathname: '/sitemap-categories.xml', hasEntries: true },
  { pathname: '/sitemap-memes.xml', hasEntries: false }
] as const satisfies readonly ChildSitemap[]

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'
const LOC_PATTERN = /<loc>([^<]+)<\/loc>/gu

const readLocations = (body: string) => {
  return [...body.matchAll(LOC_PATTERN)].map((match) => {
    return match[1] ?? ''
  })
}

test('the sitemap index points at its three children', async ({ request }) => {
  const response = await request.get('/sitemap.xml')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('xml')

  const body = await response.text()

  expect(body.startsWith(XML_DECLARATION)).toBe(true)
  expect(readLocations(body)).toEqual(
    CHILD_SITEMAPS.map((sitemap) => {
      return `${E2E_BASE_URL}${sitemap.pathname}`
    })
  )
})

for (const sitemap of CHILD_SITEMAPS) {
  test(`${sitemap.pathname} is XML and only lists pages of ours`, async ({
    request
  }) => {
    const response = await request.get(sitemap.pathname)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('xml')

    const body = await response.text()

    expect(body.startsWith(XML_DECLARATION)).toBe(true)
    expect(body).toContain('</urlset>')

    const locations = readLocations(body)

    expect(locations.length > 0).toBe(sitemap.hasEntries)

    // A video host in a <loc> would offer Google a raw file where a page is
    // expected. The memes sitemap does carry video URLs, but only inside the
    // video tags Google reads for indexing.
    for (const location of locations) {
      expect(location.startsWith(E2E_BASE_URL)).toBe(true)
      expect(location).not.toContain(E2E_BUNNY_HOSTNAME)
    }
  })
}

test('robots.txt answers and hands over the sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/plain')
  expect(await response.text()).toContain(
    `Sitemap: ${E2E_BASE_URL}/sitemap.xml`
  )
})

test('the health route answers', async ({ request }) => {
  const response = await request.get('/health')

  expect(response.status()).toBe(200)
})

test('the manifest is JSON and starts on the library', async ({ request }) => {
  const response = await request.get('/manifest.json')

  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    name: 'Petit Meme',
    start_url: expect.stringContaining('/memes')
  })
})

test('the OG endpoint renders an image', async ({ request }) => {
  const response = await request.get('/api/og?type=home')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/')

  const image = await response.body()

  expect(image.byteLength).toBeGreaterThan(0)
})
