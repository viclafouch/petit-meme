// oxlint-disable-next-line import/no-unassigned-import -- Sentry init must run before any other module
import '~/instrument.server'
import * as Sentry from '@sentry/tanstackstart-react'
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
  handleStartError
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'

const customHandler = defineHandlerCallback(async (context) => {
  context.responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
  context.responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return defaultStreamHandler(context)
})

const startHandler = createStartHandler(customHandler)

type StartHandlerOptions = Parameters<typeof startHandler>[1]

export default createServerEntry(
  Sentry.wrapFetchWithSentry({
    async fetch(request, options?: StartHandlerOptions) {
      try {
        return await paraglideMiddleware(request, () => {
          return startHandler(request, options)
        })
      } catch (error) {
        Sentry.captureException(error)

        return handleStartError(error)
      }
    }
  })
)
