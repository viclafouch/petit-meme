// oxlint-disable-next-line import/no-unassigned-import -- Sentry init must run before any other module
import '~/instrument.server'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'

const customHandler = defineHandlerCallback(async (context) => {
  context.responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
  context.responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return defaultStreamHandler(context)
})

const handler = createStartHandler(customHandler)

export default createServerEntry(
  wrapFetchWithSentry({
    fetch: (request) => {
      return paraglideMiddleware(request, () => {
        return handler(request)
      })
    }
  })
)
