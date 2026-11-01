import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import {
  createSerializationAdapter,
  isNotFound,
  isRedirect
} from '@tanstack/react-router'
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart
} from '@tanstack/react-start'
import { AppError, getAppErrorCode } from '~/constants/error'
import { logger } from '~/lib/logger'
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

const matchIsUnexpectedError = (error: unknown) => {
  return (
    getAppErrorCode(error) === undefined &&
    !isNotFound(error) &&
    !isRedirect(error)
  )
}

const unexpectedErrorLogMiddleware = createMiddleware({
  type: 'function'
}).server(async ({ next, serverFnMeta }) => {
  try {
    return await next()
  } catch (error) {
    if (matchIsUnexpectedError(error)) {
      logger.error(
        { error, serverFunction: serverFnMeta.name },
        'Server function failed'
      )
    }

    throw error
  }
})

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    serializationAdapters: [appErrorAdapter],
    requestMiddleware: [sentryGlobalRequestMiddleware, csrfMiddleware],
    functionMiddleware: [
      sentryGlobalFunctionMiddleware,
      unexpectedErrorLogMiddleware
    ]
  }
})
