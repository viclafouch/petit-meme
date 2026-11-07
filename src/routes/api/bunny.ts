import { createFileRoute } from '@tanstack/react-router'
import { handleBunnyWebhook } from '~/lib/bunny-webhook'

export const Route = createFileRoute('/api/bunny')({
  server: {
    handlers: {
      POST: ({ request }) => {
        return handleBunnyWebhook(request)
      }
    }
  }
})
