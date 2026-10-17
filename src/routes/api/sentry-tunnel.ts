import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const SENTRY_HOST_SUFFIX = '.sentry.io'
const SENTRY_FORWARD_TIMEOUT_MS = 10_000

const ENVELOPE_HEADER_SCHEMA = z.object({
  dsn: z.string().optional()
})

function parseEnvelopeHeader(envelope: string) {
  const firstLine = envelope.split('\n')[0]

  if (!firstLine) {
    return null
  }

  try {
    const header = ENVELOPE_HEADER_SCHEMA.safeParse(JSON.parse(firstLine))

    if (!header.success || !header.data.dsn) {
      return null
    }

    const dsn = new URL(header.data.dsn)

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
      GET: () => {
        return new Response('Method Not Allowed', { status: 405 })
      },
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

        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, SENTRY_FORWARD_TIMEOUT_MS)

        try {
          const response = await fetch(upstream, {
            method: 'POST',
            body: envelopeBytes,
            signal: controller.signal,
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
        } catch {
          return new Response('Upstream timeout', { status: 502 })
        } finally {
          clearTimeout(timeoutId)
        }
      }
    }
  }
})
