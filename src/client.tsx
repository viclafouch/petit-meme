import { hydrateRoot } from 'react-dom/client'
import { z } from 'zod'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { getRouter } from './router'

z.config(z.locales.fr())

const router = getRouter()

hydrateRoot(document, <RouterClient router={router} />)
