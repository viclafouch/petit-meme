import { describe, expect, it } from 'vitest'

const importHomeJsonLd = () => {
  return import('~/routes/_public__root/-lib/home-json-ld')
}

describe('site structured data', () => {
  it('should name the site on the canonical home page URL', async () => {
    const { buildWebsiteNode } = await importHomeJsonLd()

    expect(buildWebsiteNode()).toMatchObject({
      '@type': 'WebSite',
      name: 'Petit Meme',
      url: 'https://www.petit-meme.io/'
    })
  })
})
