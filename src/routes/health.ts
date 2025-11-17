import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: () => {
        return new Response('Hello, World!', {
          status: 200
        })
      }
    }
  }
})
