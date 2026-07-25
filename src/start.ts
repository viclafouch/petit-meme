import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { customErrorAdapter } from '~/constants/error'
import { observeCsrfBlock } from '~/utils/csrf-observer'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => {
    return ctx.handlerType === 'serverFn'
  },
  failureResponse: (ctx) => {
    observeCsrfBlock(ctx.request)

    return new Response('Forbidden', { status: 403 })
  }
})

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    serializationAdapters: [customErrorAdapter],
    requestMiddleware: [csrfMiddleware, sentryGlobalRequestMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware]
  }
})
