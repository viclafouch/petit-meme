import { createFileRoute } from '@tanstack/react-router'
import { SITE_NAME } from '~/constants/branding'
import { OFFLINE_ICON_PATHNAME, WEB_APP_THEME_COLOR } from '~/constants/pwa'
import { m } from '~/paraglide/messages'
import {
  baseLocale,
  extractLocaleFromUrl,
  type Locale
} from '~/paraglide/runtime'

const OFFLINE_PAGE_STYLE = `
:root {
  color-scheme: dark light;
  --background: light-dark(oklch(1 0 0), oklch(0.145 0 0));
  --foreground: light-dark(oklch(0.145 0 0), oklch(0.985 0 0));
  --muted-foreground: light-dark(oklch(0.556 0 0), oklch(0.708 0 0));
  --primary: light-dark(oklch(0.205 0 0), oklch(0.922 0 0));
  --primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.205 0 0));
}
* { box-sizing: border-box; margin: 0; }
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  overscroll-behavior: none;
}
body {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: max(1.5rem, env(safe-area-inset-top, 0px)) max(1.5rem, env(safe-area-inset-right, 0px)) max(1.5rem, env(safe-area-inset-bottom, 0px)) max(1.5rem, env(safe-area-inset-left, 0px));
  background: var(--background);
  color: var(--foreground);
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-align: center;
}
main { display: grid; justify-items: center; gap: 0.75rem; max-width: 20rem; }
img { width: 7rem; height: 7rem; margin-bottom: 0.5rem; }
h1 { font-size: 1.5rem; line-height: 1.2; font-weight: 700; text-wrap: balance; }
p { color: var(--muted-foreground); line-height: 1.5; text-wrap: pretty; }
button {
  margin-top: 1rem;
  min-height: 2.75rem;
  padding: 0 1.75rem;
  border: 0;
  border-radius: 0.625rem;
  background: var(--primary);
  color: var(--primary-foreground);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 120ms ease-out;
}
button:active { transform: scale(0.97); }
button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
`

const RELOAD_WHEN_ONLINE_SCRIPT = `
const reload = () => location.reload();
document.querySelector('button').addEventListener('click', reload);
addEventListener('online', reload);
`

const renderOfflinePage = (locale: Locale) => {
  const title = m.offline_title({}, { locale })

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="${WEB_APP_THEME_COLOR}">
<title>${SITE_NAME} - ${title}</title>
<style>${OFFLINE_PAGE_STYLE}</style>
</head>
<body>
<main>
<img src="${OFFLINE_ICON_PATHNAME}" alt="" width="112" height="112">
<h1>${title}</h1>
<p>${m.offline_description({}, { locale })}</p>
<button type="button">${m.common_retry({}, { locale })}</button>
</main>
<script>${RELOAD_WHEN_ONLINE_SCRIPT}</script>
</body>
</html>`
}

export const Route = createFileRoute('/offline')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const locale = extractLocaleFromUrl(request.url) ?? baseLocale

        return new Response(renderOfflinePage(locale), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex'
          }
        })
      }
    }
  }
})
