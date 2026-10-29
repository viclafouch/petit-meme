import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { describe, expect, it } from 'vitest'
import { AUTH_BASE_PATH, AUTH_RATE_LIMIT } from '~/constants/auth'
import { HTTP_STATUS } from '~/constants/http'

const BASE_URL = 'http://localhost:3000'
const SIGN_IN_MAX = AUTH_RATE_LIMIT.customRules['/sign-in/email'].max

const createSharedDatabase = () => {
  return { user: [], session: [], account: [], verification: [], rateLimit: [] }
}

const createInstance = (database: ReturnType<typeof createSharedDatabase>) => {
  return betterAuth({
    secret: 'auth-rate-limit-test-secret-00001',
    baseURL: BASE_URL,
    basePath: AUTH_BASE_PATH,
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    rateLimit: { ...AUTH_RATE_LIMIT, enabled: true }
  })
}

type Instance = ReturnType<typeof createInstance>

const signIn = async (instance: Instance, ip: string) => {
  const response = await instance.handler(
    new Request(`${BASE_URL}${AUTH_BASE_PATH}/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email: 'nobody@example.test', password: 'x' })
    })
  )

  return response.status
}

const getSession = async (instance: Instance, ip: string) => {
  const response = await instance.handler(
    new Request(`${BASE_URL}${AUTH_BASE_PATH}/get-session`, {
      headers: { 'x-forwarded-for': ip }
    })
  )

  return response.status
}

const repeat = async (
  times: number,
  request: () => Promise<number>
): Promise<number[]> => {
  if (times === 0) {
    return []
  }

  const status = await request()

  return [status, ...(await repeat(times - 1, request))]
}

describe('auth rate limit', () => {
  it('should share one counter between two instances on the same database', async () => {
    const database = createSharedDatabase()
    const instanceA = createInstance(database)
    const instanceB = createInstance(database)
    const ip = '203.0.113.1'

    await repeat(SIGN_IN_MAX, () => {
      return signIn(instanceA, ip)
    })

    expect(await signIn(instanceB, ip)).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
  })

  it('should keep the counter in the database rather than in the process', async () => {
    const instanceA = createInstance(createSharedDatabase())
    const instanceB = createInstance(createSharedDatabase())
    const ip = '203.0.113.2'

    await repeat(SIGN_IN_MAX + 1, () => {
      return signIn(instanceA, ip)
    })

    expect(await signIn(instanceB, ip)).not.toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
  })

  it('should never limit get-session', async () => {
    const instance = createInstance(createSharedDatabase())
    const ip = '203.0.113.3'

    const statuses = await repeat(AUTH_RATE_LIMIT.max + 1, () => {
      return getSession(instance, ip)
    })

    expect(statuses).not.toContain(HTTP_STATUS.TOO_MANY_REQUESTS)
  })
})
