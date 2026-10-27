import { verifyJWT } from 'better-auth/crypto'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ONE_DAY_IN_SECONDS } from '~/constants/time'
import {
  buildEmailVerificationPath,
  createEmailVerificationPath
} from '~/utils/email-verification'

const ORIGIN = 'https://petit-meme.test'
const TOKEN = 'header.payload.signature'
const SECRET = 'email-verification-test-secret-0001'

const VERIFICATION_QUERY_SCHEMA = z.object({ token: z.string() })

describe('buildEmailVerificationPath', () => {
  it('should point a French User at the verify email page', () => {
    const path = buildEmailVerificationPath({ token: TOKEN, locale: 'fr' })

    expect(new URL(path, ORIGIN).pathname).toBe('/verify-email')
  })

  it('should point an English User at the English verify email page', () => {
    const path = buildEmailVerificationPath({ token: TOKEN, locale: 'en' })

    expect(new URL(path, ORIGIN).pathname).toBe('/en/verify-email')
  })

  it('should carry the token in the query', () => {
    const path = buildEmailVerificationPath({ token: TOKEN, locale: 'fr' })

    expect(new URL(path, ORIGIN).searchParams.get('token')).toBe(TOKEN)
  })
})

describe('createEmailVerificationPath', () => {
  it('should sign a token better-auth verifies for the lowercased email', async () => {
    const path = await createEmailVerificationPath({
      email: 'Victor@Example.com',
      secret: SECRET,
      expiresInSeconds: ONE_DAY_IN_SECONDS,
      locale: 'fr'
    })
    const { token } = VERIFICATION_QUERY_SCHEMA.parse(
      Object.fromEntries(new URL(path, ORIGIN).searchParams)
    )

    const payload = await verifyJWT<{ email: string }>(token, SECRET)

    expect(payload?.email).toBe('victor@example.com')
  })
})
