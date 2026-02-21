import { createFileRoute } from '@tanstack/react-router'

const SENTRY_HOST_SUFFIX = '.sentry.io'

function parseEnvelopeHeader(envelope: string) {
  const firstLine = envelope.split('\n')[0]

  if (!firstLine) {
    return null
  }

  try {
    const header = JSON.parse(firstLine) as { dsn?: string }

    if (!header.dsn) {
      return null
    }

    const dsn = new URL(header.dsn)

    return {
      projectId: dsn.pathname.replace('/', ''),
      hostname: dsn.hostname
    }
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/sentry-tunnel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const envelopeBytes = await request.arrayBuffer()
        const envelope = new TextDecoder().decode(envelopeBytes)
        const header = parseEnvelopeHeader(envelope)

        if (!header) {
          return new Response('Invalid envelope', { status: 400 })
        }

        if (!header.hostname.endsWith(SENTRY_HOST_SUFFIX)) {
          return new Response('Invalid host', { status: 403 })
        }

        const upstream = `https://${header.hostname}/api/${header.projectId}/envelope/`

        const response = await fetch(upstream, {
          method: 'POST',
          body: envelopeBytes,
          headers: {
            'Content-Type': 'application/x-sentry-envelope'
          }
        })

        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type':
              response.headers.get('Content-Type') ?? 'application/json'
          }
        })
      }
    }
  }
})
