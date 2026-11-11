import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureWithFeature } from '~/lib/sentry'
import {
  sendEmail,
  sendEmailInBackground
} from '~/server/platforms/resend.server'

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const fetchMock = vi.fn<typeof fetch>(async () => {
  return Response.json({ id: 'email-id' })
})

const getSentIdempotencyKey = () => {
  const [, init] = fetchMock.mock.lastCall ?? []

  return new Headers(init?.headers).get('Idempotency-Key')
}

describe('resend', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
    vi.mocked(captureWithFeature).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('sendEmail', () => {
    it('should send the idempotency key to Resend', async () => {
      await sendEmail({
        to: 'alan@example.com',
        subject: 'Payment failed',
        react: createElement('div'),
        idempotencyKey: 'payment-failed/evt_123'
      })

      expect(getSentIdempotencyKey()).toBe('payment-failed/evt_123')
    })

    it('should send no idempotency key when the caller gives none', async () => {
      await sendEmail({
        to: 'alan@example.com',
        subject: 'Password changed',
        react: createElement('div')
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(getSentIdempotencyKey()).toBeNull()
    })

    it.each(['invalid_idempotent_request', 'concurrent_idempotent_requests'])(
      'should count a %s answer as an email already sent',
      async (name) => {
        fetchMock.mockResolvedValueOnce(
          Response.json(
            { name, message: 'Duplicate', statusCode: 409 },
            { status: 409 }
          )
        )

        const isSent = await sendEmail({
          to: 'alan@example.com',
          subject: 'Payment failed',
          react: createElement('div'),
          idempotencyKey: 'payment-failed/evt_123'
        })

        expect(isSent).toBe(true)
        expect(captureWithFeature).not.toHaveBeenCalled()
      }
    )
  })

  describe('sendEmailInBackground', () => {
    it('should send the idempotency key to Resend', async () => {
      sendEmailInBackground({
        to: 'alan@example.com',
        subject: 'Subscription confirmed',
        react: createElement('div'),
        logMessage: 'Sending subscription confirmed email to',
        idempotencyKey: 'subscription-confirmed/evt_456'
      })

      await vi.waitFor(() => {
        expect(getSentIdempotencyKey()).toBe('subscription-confirmed/evt_456')
      })
    })
  })
})
