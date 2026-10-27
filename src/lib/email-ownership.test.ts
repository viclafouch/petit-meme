import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createEmailVerificationToken } from 'better-auth/api'
import { describe, expect, it } from 'vitest'
import { verifyEmailWithPassword } from '~/lib/email-ownership'

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
