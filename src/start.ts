import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware
} from '@sentry/tanstackstart-react'
import { createSerializationAdapter } from '@tanstack/react-router'
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart
} from '@tanstack/react-start'
import { AppError } from '~/constants/error'
import { MEME_FILL_PATH } from '~/constants/meme-fill'
import { matchIsUnexpectedError } from '~/lib/expected-error'
import { logger } from '~/lib/logger'
import { serverFnFetch } from '~/lib/server-fn-fetch'
import { observeCsrfBlock } from '~/server/http/csrf-observer.functions'

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
    return (
      context.handlerType === 'serverFn' || context.pathname === MEME_FILL_PATH
    )
  },
  failureResponse: (context) => {
    observeCsrfBlock(context.request)

    return new Response('Forbidden', { status: 403 })
  }
})

const UNKNOWN_SERVER_FN_MESSAGE = 'Server function info not found for '

const matchIsUnknownServerFnError = (error: unknown) => {
  return (
    error instanceof Error &&
    error.message.startsWith(UNKNOWN_SERVER_FN_MESSAGE)
  )
}

const unknownServerFnMiddleware = createMiddleware().server(
  async ({ next, handlerType }) => {
    try {
      return await next()
    } catch (error) {
      if (handlerType === 'serverFn' && matchIsUnknownServerFnError(error)) {
        return new Response('Not Found', { status: 404 })
      }

      throw error
    }
  }
)

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
    serverFns: { fetch: serverFnFetch },
    requestMiddleware: [
      sentryGlobalRequestMiddleware,
      csrfMiddleware,
      unknownServerFnMiddleware
    ],
    functionMiddleware: [
      sentryGlobalFunctionMiddleware,
      unexpectedErrorLogMiddleware
    ]
  }
})
