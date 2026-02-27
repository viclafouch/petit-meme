import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

const customHandler = defineHandlerCallback(async (context) => {
  const response = await defaultStreamHandler(context)

  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return response
})

const handler = createStartHandler(customHandler)

export default createServerEntry({
  fetch: (request) => {
    return handler(request)
  }
})
