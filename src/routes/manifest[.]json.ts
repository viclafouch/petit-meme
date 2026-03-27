import { m } from '~/paraglide/messages.js'
import { baseLocale, getLocale } from '~/paraglide/runtime'
import { createFileRoute } from '@tanstack/react-router'

const getLocalizedPathname = (pathname: string) => {
  const locale = getLocale()

  if (locale === baseLocale) {
    return pathname
  }

  return `/${locale}${pathname}`
}

export const Route = createFileRoute('/manifest.json')({
  server: {
    handlers: {
      GET: () => {
        const locale = getLocale()

        const manifest = {
          name: 'Petit Meme',
          // eslint-disable-next-line camelcase -- Web App Manifest spec uses snake_case
          short_name: 'Petit Meme',
          // eslint-disable-next-line camelcase -- Web App Manifest spec uses snake_case
          start_url: `${getLocalizedPathname('/memes')}?utm_medium=PWA&utm_source=launcher`,
          scope: getLocalizedPathname('/'),
          display: 'standalone',
          orientation: 'portrait-primary',
          // eslint-disable-next-line camelcase -- Web App Manifest spec uses snake_case
          background_color: '#000000',
          // eslint-disable-next-line camelcase -- Web App Manifest spec uses snake_case
          theme_color: '#000000',
          lang: locale,
          description: m.manifest_description(),
          categories: [
            m.manifest_category_entertainment(),
            m.manifest_category_humor(),
            m.manifest_category_memes(),
            m.manifest_category_creation(),
            m.manifest_category_social()
          ],
          icons: [
            {
              src: '/android-chrome-192x192.png',
              type: 'image/png',
              sizes: '192x192'
            },
            {
              src: '/android-chrome-512x512.png',
              type: 'image/png',
              sizes: '512x512'
            },
            {
              src: '/apple-touch-icon.png',
              type: 'image/png',
              sizes: '180x180'
            }
          ]
        }

        return new Response(JSON.stringify(manifest), {
          headers: {
            'Content-Type': 'application/manifest+json'
          }
        })
      }
    }
  }
})
