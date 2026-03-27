import { createFileRoute } from '@tanstack/react-router'
import {
  buildLocalizedEntries,
  buildSitemapResponse,
  type SitemapPage,
  wrapUrlset
} from '~/lib/sitemap'

const STATIC_PAGES = [
  { pathname: '/' },
  { pathname: '/pricing' },
  { pathname: '/reels' },
  { pathname: '/submit' },
  { pathname: '/terms-of-use' },
  { pathname: '/privacy' },
  { pathname: '/mentions-legales' }
] as const satisfies readonly SitemapPage[]

export const Route = createFileRoute('/sitemap-static.xml')({
  server: {
    handlers: {
      GET: () => {
        return buildSitemapResponse({
          body: wrapUrlset(buildLocalizedEntries(STATIC_PAGES)),
          maxAge: 86_400
        })
      }
    }
  }
})
