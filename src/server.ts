import { clientEnv } from '@/env/client'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

const canonicalHost = new URL(clientEnv.VITE_SITE_URL).hostname

const customHandler = defineHandlerCallback(async (context) => {
  const url = new URL(context.request.url)

  if (url.hostname.includes('www.')) {
    url.hostname = canonicalHost

    return new Response(null, {
      status: 301,
      headers: {
        Location: url.toString()
      }
    })
  }

  const response = await defaultStreamHandler(context)

  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return response
})

const handler = createStartHandler(customHandler)

export default createServerEntry(
  wrapFetchWithSentry({
    fetch: (request) => {
      return handler(request)
    }
  })
)
