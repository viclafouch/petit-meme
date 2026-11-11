import { createFileRoute } from '@tanstack/react-router'
import { handleMemeFillRequest } from '~/server/admin/ai-assist/meme-fill-request.server'

export const Route = createFileRoute('/api/meme-fill')({
  server: {
    handlers: {
      POST: ({ request }) => {
        return handleMemeFillRequest(request)
      }
    }
  }
})
