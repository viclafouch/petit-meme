import { createFileRoute } from '@tanstack/react-router'
import { websiteOrigin } from '~/lib/seo'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const robots = [
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          `Sitemap: ${websiteOrigin}/sitemap.xml`
        ].join('\n')

        return new Response(robots, {
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      }
    }
  }
})
