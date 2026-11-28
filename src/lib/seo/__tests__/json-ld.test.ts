import { describe, expect, it } from 'vitest'

const importJsonLd = () => {
  return import('~/lib/seo/json-ld')
}

describe('breadcrumb structured data', () => {
  it('should start at the home page and link every crumb but the current page', async () => {
    const { buildBreadcrumbNode } = await importJsonLd()

    expect(
      buildBreadcrumbNode([{ name: 'Questions fréquentes', pathname: '/faq' }])
    ).toStrictEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://www.petit-meme.io/'
        },
        { '@type': 'ListItem', position: 2, name: 'Questions fréquentes' }
      ]
    })
  })

  it('should name a Meme without a Category after the whole library', async () => {
    const { buildCategoryCrumb } = await importJsonLd()

    expect(buildCategoryCrumb()).toStrictEqual({
      name: 'Tous les mèmes',
      pathname: '/memes/category/all'
    })
  })
})
