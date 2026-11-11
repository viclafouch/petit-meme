import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createEmailVerificationToken } from 'better-auth/api'
import { verifyJWT } from 'better-auth/crypto'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ONE_DAY_IN_SECONDS } from '~/constants/time'
import {
  buildEmailVerificationPath,
  createEmailVerificationPath,
  verifyEmailWithPassword
} from '~/server/auth/email-verification.server'

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

const TEST_SECRET = 'email-ownership-test-secret-00001'
const OWNER_EMAIL = 'owner@example.test'
const OWNER_PASSWORD = 'owner-horse-battery'
const ATTACKER_PASSWORD = 'attacker-horse-battery'

type TestAuthParams = {
  onResetPasswordToken?: (token: string) => void
}

const createTestAuth = ({ onResetPasswordToken }: TestAuthParams = {}) => {
  return betterAuth({
    secret: TEST_SECRET,
    baseURL: 'http://localhost:3000',
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: []
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ token }) => {
        onResetPasswordToken?.(token)
      }
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async () => {}
    }
  })
}

const signUp = async (
  auth: ReturnType<typeof createTestAuth>,
  password: string
) => {
  await auth.api.signUpEmail({
    body: { name: 'Owner', email: OWNER_EMAIL, password }
  })

  return createEmailVerificationToken(TEST_SECRET, OWNER_EMAIL)
}

const findOwner = async (auth: ReturnType<typeof createTestAuth>) => {
  const context = await auth.$context

  return context.internalAdapter.findUserByEmail(OWNER_EMAIL)
}

describe('verifyEmailWithPassword', () => {
  it('should verify the email when the password matches', async () => {
    const auth = createTestAuth()
    const token = await signUp(auth, OWNER_PASSWORD)

    await verifyEmailWithPassword(auth, {
      token,
      password: OWNER_PASSWORD,
      headers: new Headers()
    })

    const owner = await findOwner(auth)
    expect(owner?.user.emailVerified).toBe(true)
  })

  it('should keep the email unverified when the password differs', async () => {
    const auth = createTestAuth()
    const token = await signUp(auth, ATTACKER_PASSWORD)

    await Promise.allSettled([
      verifyEmailWithPassword(auth, {
        token,
        password: OWNER_PASSWORD,
        headers: new Headers()
      })
    ])

    const owner = await findOwner(auth)
    expect(owner?.user.emailVerified).toBe(false)
  })

  it('should refuse the sign-up password once the owner resets it and verifies the email', async () => {
    const resetToken = Promise.withResolvers<string>()
    const auth = createTestAuth({ onResetPasswordToken: resetToken.resolve })
    const verificationToken = await signUp(auth, ATTACKER_PASSWORD)
    await auth.api.requestPasswordReset({ body: { email: OWNER_EMAIL } })
    await auth.api.resetPassword({
      body: { token: await resetToken.promise, newPassword: OWNER_PASSWORD }
    })
    await verifyEmailWithPassword(auth, {
      token: verificationToken,
      password: OWNER_PASSWORD,
      headers: new Headers()
    })

    const attackerSignIn = auth.api.signInEmail({
      body: { email: OWNER_EMAIL, password: ATTACKER_PASSWORD }
    })

    await expect(attackerSignIn).rejects.toMatchObject({ statusCode: 401 })
  })

  it('should refuse an expired link as an invalid token', async () => {
    const auth = createTestAuth()
    await signUp(auth, OWNER_PASSWORD)
    const expiredToken = await createEmailVerificationToken(
      TEST_SECRET,
      OWNER_EMAIL,
      undefined,
      -1
    )

    const verification = verifyEmailWithPassword(auth, {
      token: expiredToken,
      password: OWNER_PASSWORD,
      headers: new Headers()
    })

    await expect(verification).rejects.toMatchObject({
      body: { code: 'INVALID_TOKEN' }
    })
  })
})
