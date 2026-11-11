import { createFileRoute } from '@tanstack/react-router'
import { handleBunnyWebhook } from '~/server/platforms/bunny-webhook.server'

export const Route = createFileRoute('/api/bunny')({
  server: {
    handlers: {
      POST: ({ request }) => {
        return handleBunnyWebhook(request)
      }
    }
  }
})
