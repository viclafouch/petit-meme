import { createEmailVerificationToken } from 'better-auth/api'
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
