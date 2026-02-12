import { hydrateRoot } from 'react-dom/client'
import { z } from 'zod'
import { hasAcceptedCookies } from '@/lib/cookie-consent'
import { initMixpanel } from '@/lib/mixpanel'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { getRouter } from './router'

z.config(z.locales.fr())

if (hasAcceptedCookies()) {
  initMixpanel()
}

const router = getRouter()

hydrateRoot(document, <RouterClient router={router} />)
