import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { customErrorAdapter } from '~/constants/error'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => {
    return ctx.handlerType === 'serverFn'
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
