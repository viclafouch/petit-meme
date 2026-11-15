import { createFileRoute } from '@tanstack/react-router'
import { respondToOembedRequest } from '~/server/seo/oembed.server'

export const Route = createFileRoute('/api/oembed')({
  server: {
    handlers: {
      GET: ({ request }) => {
        return respondToOembedRequest(new URL(request.url))
      }
    }
  }
})
