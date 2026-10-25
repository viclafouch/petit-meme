import { createEmailVerificationToken } from 'better-auth/api'
import { AUTH_BASE_PATH } from '~/constants/auth'

type EmailVerificationPathParams = {
  email: string
  secret: string
  expiresInSeconds: number
}

export const buildEmailVerificationPath = async ({
  email,
  secret,
  expiresInSeconds
}: EmailVerificationPathParams) => {
  const token = await createEmailVerificationToken(
    secret,
    email,
    undefined,
    expiresInSeconds
  )
  const searchParams = new URLSearchParams({ token, callbackURL: '/' })

  return `${AUTH_BASE_PATH}/verify-email?${searchParams}`
}
