import { describe, expect, it } from 'vitest'
import { scrubAnalyticsEvent, toAnalyticsPageView } from '~/lib/web-analytics'

describe('toAnalyticsPageView', () => {
  it('should group a dynamic page under its route with its params in brackets', () => {
    expect(
      toAnalyticsPageView(
        {
          routeId: '/_studio/memes/$memeId/studio',
          fullPath: '/memes/$memeId/studio',
          pathname: '/memes/abc/studio'
        },
        'fr'
      )
    ).toStrictEqual({
      route: '/memes/[memeId]/studio',
      path: '/memes/abc/studio'
    })
  })

  it('should keep the English prefix on the path but not on the route', () => {
    expect(
      toAnalyticsPageView(
        {
          routeId: '/_public__root/_default/memes/$memeId',
          fullPath: '/memes/$memeId',
          pathname: '/memes/abc'
        },
        'en'
      )
    ).toStrictEqual({ route: '/memes/[memeId]', path: '/en/memes/abc' })
  })

  it('should fold an index route into its parent path', () => {
    expect(
      toAnalyticsPageView(
        {
          routeId: '/_public__root/_default/pricing/',
          fullPath: '/pricing/',
          pathname: '/pricing/'
        },
        'en'
      )
    ).toStrictEqual({ route: '/pricing', path: '/en/pricing' })
  })

  it('should keep the home page on the root route', () => {
    expect(
      toAnalyticsPageView(
        { routeId: '/_public__root/', fullPath: '/', pathname: '/' },
        'fr'
      )
    ).toStrictEqual({ route: '/', path: '/' })
  })

  it.each(['fr', 'en'] as const)(
    'should count no administration page in %s',
    (locale) => {
      expect(
        toAnalyticsPageView(
          {
            routeId: '/admin/activity/$ip',
            fullPath: '/admin/activity/$ip',
            pathname: '/admin/activity/203.0.113.7'
          },
          locale
        )
      ).toBeNull()
    }
  )

  it('should still count a public page whose path starts like the administration', () => {
    expect(
      toAnalyticsPageView(
        {
          routeId: '/_public__root/_default/memes/category/$slug',
          fullPath: '/memes/category/$slug',
          pathname: '/memes/category/administration'
        },
        'fr'
      )
    ).toStrictEqual({
      route: '/memes/category/[slug]',
      path: '/memes/category/administration'
    })
  })

  it('should count no page when only the root route matches a missing page', () => {
    expect(
      toAnalyticsPageView(
        { routeId: '__root__', fullPath: '/', pathname: '/' },
        'fr'
      )
    ).toBeNull()
  })
})

describe('scrubAnalyticsEvent', () => {
  it('should send a page view without its query string', () => {
    expect(
      scrubAnalyticsEvent({
        type: 'pageview',
        url: 'https://petit-meme.io/en/verify-email?token=secret'
      })
    ).toStrictEqual({
      type: 'pageview',
      url: 'https://petit-meme.io/en/verify-email'
    })
  })

  it('should send a page view without its hash', () => {
    expect(
      scrubAnalyticsEvent({
        type: 'pageview',
        url: 'https://petit-meme.io/memes/abc?query=chat#comments'
      })
    ).toStrictEqual({
      type: 'pageview',
      url: 'https://petit-meme.io/memes/abc'
    })
  })
})
