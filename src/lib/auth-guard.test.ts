import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { describe, expect, it } from 'vitest'
import { USER_NAME_MAX_LENGTH } from '~/constants/auth'
import { signUpGuard } from '~/lib/auth-guard'

const VALID_SIGN_UP_BODY = {
  name: 'Alan',
  email: 'alan@example.test',
  password: 'correct-horse-battery'
}

const createTestAuth = () => {
  return betterAuth({
    secret: 'auth-guard-test-secret-0000000001',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    hooks: { before: signUpGuard }
  })
}

describe('signUpGuard', () => {
  it('should create the User from the fields the sign up form sends', async () => {
    const auth = createTestAuth()

    const { user } = await auth.api.signUpEmail({ body: VALID_SIGN_UP_BODY })

    expect(user.email).toBe('alan@example.test')
  })

  it('should refuse a sign up that sets stripeCustomerId', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, stripeCustomerId: 'cus_victim' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a sign up that sets an image', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, image: 'https://attacker.test/t.png' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a name longer than the maximum length', async () => {
    const auth = createTestAuth()
    const body = {
      ...VALID_SIGN_UP_BODY,
      name: 'a'.repeat(USER_NAME_MAX_LENGTH + 1)
    }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should refuse a name made of spaces only', async () => {
    const auth = createTestAuth()
    const body = { ...VALID_SIGN_UP_BODY, name: '   ' }

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should store the name without its surrounding spaces', async () => {
    const auth = createTestAuth()

    const { user } = await auth.api.signUpEmail({
      body: { ...VALID_SIGN_UP_BODY, name: '  Alan  ' }
    })

    expect(user.name).toBe('Alan')
  })
})
