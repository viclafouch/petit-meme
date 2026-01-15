// src/entry-client.tsx
import { hydrateRoot } from 'react-dom/client'
import mixpanel from 'mixpanel-browser'
import { z } from 'zod'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { getRouter } from './router'

z.config(z.locales.fr())

mixpanel.init('5800e2b9e077ccdaf4cadb637f919c14', {
  // eslint-disable-next-line camelcase
  track_pageview: true,
  autocapture: true,
  // eslint-disable-next-line camelcase
  ignore_dnt: true,
  // eslint-disable-next-line camelcase
  opt_out_persistence_by_default: false,
  debug: process.env.NODE_ENV === 'development',
  persistence: 'localStorage'
})

const router = getRouter()

hydrateRoot(document, <RouterClient router={router} />)
