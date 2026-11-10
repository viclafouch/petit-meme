import { createFileRoute } from '@tanstack/react-router'
import { handleMemeFillRequest } from '~/lib/meme-fill-request.server'

export const Route = createFileRoute('/api/meme-fill')({
  server: {
    handlers: {
      POST: ({ request }) => {
        return handleMemeFillRequest(request)
      }
    }
  }
})
