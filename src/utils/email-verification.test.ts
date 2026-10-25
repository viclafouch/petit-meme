import { verifyJWT } from 'better-auth/crypto'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ONE_DAY_IN_SECONDS } from '~/constants/time'
import { buildEmailVerificationPath } from '~/utils/email-verification'

const SECRET = 'email-verification-test-secret-0001'
const OTHER_SECRET = 'email-verification-other-secret-0002'
const ORIGIN = 'https://petit-meme.test'

const VERIFICATION_QUERY_SCHEMA = z.object({
  token: z.string(),
  callbackURL: z.string()
})

const buildVerificationQuery = async () => {
  const path = await buildEmailVerificationPath({
    email: 'Victor@Example.com',
    secret: SECRET,
    expiresInSeconds: ONE_DAY_IN_SECONDS
  })

  return VERIFICATION_QUERY_SCHEMA.parse(
    Object.fromEntries(new URL(path, ORIGIN).searchParams)
  )
}

describe('buildEmailVerificationPath', () => {
  it('should point at the better-auth verify email endpoint', async () => {
    const path = await buildEmailVerificationPath({
      email: 'victor@example.com',
      secret: SECRET,
      expiresInSeconds: ONE_DAY_IN_SECONDS
    })

    expect(new URL(path, ORIGIN).pathname).toBe('/api/auth/verify-email')
  })

  it('should sign a token better-auth verifies for the lowercased email', async () => {
    const { token } = await buildVerificationQuery()

    const payload = await verifyJWT<{ email: string }>(token, SECRET)

    expect(payload?.email).toBe('victor@example.com')
  })

  it('should sign a token another secret cannot verify', async () => {
    const { token } = await buildVerificationQuery()

    const payload = await verifyJWT<unknown>(token, OTHER_SECRET)

    expect(payload).toBeNull()
  })

  it('should send the verified User back to the home page', async () => {
    const query = await buildVerificationQuery()

    expect(query.callbackURL).toBe('/')
  })
})
