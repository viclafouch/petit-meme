/* eslint-disable camelcase */
// src/entry-client.tsx
import { hydrateRoot } from 'react-dom/client'
import mixpanel from 'mixpanel-browser'
import { z } from 'zod'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { getRouter } from './router'

z.config(z.locales.fr())

mixpanel.init('5800e2b9e077ccdaf4cadb637f919c14', {
  track_pageview: true,
  autocapture: true,
  ignore_dnt: true,
  record_sessions_percent: 30, //records 100% of all sessions
  record_heatmap_data: true,
  debug: process.env.NODE_ENV === 'development',
  persistence: 'localStorage',
  api_host: 'https://api-eu.mixpanel.com'
})

const router = getRouter()

hydrateRoot(document, <RouterClient router={router} />)
