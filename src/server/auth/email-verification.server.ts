import {
  APIError,
  BASE_ERROR_CODES,
  type Auth,
  type AuthContext
} from 'better-auth'
import { createEmailVerificationToken } from 'better-auth/api'
import { verifyJWT } from 'better-auth/crypto'
import { z } from 'zod'
import type { UserLocale } from '~/db/generated/prisma/enums'
import { localizeHref } from '~/paraglide/runtime'

type EmailVerificationPathParams = {
  token: string
  locale: UserLocale
}

type SignedEmailVerificationPathParams = {
  email: string
  secret: string
  expiresInSeconds: number
  locale: UserLocale
}

type EmailOwnershipContext = {
  secret: AuthContext['secret']
  password: Pick<AuthContext['password'], 'verify'>
  internalAdapter: Pick<AuthContext['internalAdapter'], 'findUserByEmail'>
}

type EmailOwnershipAuth = {
  $context: Promise<EmailOwnershipContext>
  api: Pick<Auth['api'], 'verifyEmail'>
}

type VerifyEmailWithPasswordParams = {
  token: string
  password: string
  headers: Headers
}

const VERIFICATION_TOKEN_PAYLOAD_SCHEMA = z.object({ email: z.email() })

export const buildEmailVerificationPath = ({
  token,
  locale
}: EmailVerificationPathParams) => {
  const searchParams = new URLSearchParams({ token })

  return localizeHref(`/verify-email?${searchParams}`, { locale })
}

export const createEmailVerificationPath = async ({
  email,
  secret,
  expiresInSeconds,
  locale
}: SignedEmailVerificationPathParams) => {
  const token = await createEmailVerificationToken(
    secret,
    email,
    undefined,
    expiresInSeconds
  )

  return buildEmailVerificationPath({ token, locale })
}

const readVerificationEmail = async (token: string, secret: string) => {
  const payload = VERIFICATION_TOKEN_PAYLOAD_SCHEMA.safeParse(
    await verifyJWT(token, secret)
  )

  return payload.success ? payload.data.email : null
}

const matchIsCredentialPassword = async (
  context: EmailOwnershipContext,
  { email, password }: { email: string; password: string }
) => {
  const found = await context.internalAdapter.findUserByEmail(email, {
    includeAccounts: true
  })
  const credentialAccount = found?.accounts.find((account) => {
    return account.providerId === 'credential'
  })

  if (!credentialAccount?.password) {
    return false
  }

  return context.password.verify({ hash: credentialAccount.password, password })
}

export const verifyEmailWithPassword = async (
  auth: EmailOwnershipAuth,
  { token, password, headers }: VerifyEmailWithPasswordParams
) => {
  const context = await auth.$context
  const email = await readVerificationEmail(token, context.secret)

  if (!email) {
    throw APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.INVALID_TOKEN)
  }

  const isCredentialPassword = await matchIsCredentialPassword(context, {
    email,
    password
  })

  if (!isCredentialPassword) {
    throw APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.INVALID_PASSWORD)
  }

  return auth.api.verifyEmail({ query: { token }, headers })
}
