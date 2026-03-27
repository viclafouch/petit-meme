import { customErrorAdapter } from '~/constants/error'
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    serializationAdapters: [customErrorAdapter],
    requestMiddleware: [sentryGlobalRequestMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware]
  }
})
