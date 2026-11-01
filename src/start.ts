import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import { createSerializationAdapter } from '@tanstack/react-router'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { AppError } from '~/constants/error'
import { observeCsrfBlock } from '~/utils/csrf-observer'

const appErrorAdapter = createSerializationAdapter({
  key: 'custom-error',
  test: (value) => {
    return value instanceof AppError
  },
  toSerializable: ({ message, code }) => {
    return {
      message,
      code
    }
  },
  fromSerializable: ({ message, code }) => {
    return new AppError(message, { code })
  }
})

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => {
    return context.handlerType === 'serverFn'
  },
  failureResponse: (context) => {
    observeCsrfBlock(context.request)

    return new Response('Forbidden', { status: 403 })
  }
})

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    serializationAdapters: [appErrorAdapter],
    requestMiddleware: [sentryGlobalRequestMiddleware, csrfMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware]
  }
})
