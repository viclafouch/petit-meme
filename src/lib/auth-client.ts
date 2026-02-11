import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { StudioErrorCode } from '@/constants/error'
import { stripeClient } from '@better-auth/stripe/client'

export const authClient = createAuthClient({
  plugins: [adminClient(), stripeClient({ subscription: true })]
})

type ErrorTypes = Partial<
  Record<
    StudioErrorCode | keyof typeof authClient.$ERROR_CODES,
    {
      en: string
      fr: string
    }
  >
>

const ERROR_CODES = {
  USER_ALREADY_EXISTS: {
    en: 'User already registered',
    fr: 'Utilisateur déjà inscrit'
  },
  INVALID_EMAIL_OR_PASSWORD: {
    en: 'Invalid email or password',
    fr: 'Email ou mot de passe invalide'
  },
  // @ts-expect-error: https://github.com/better-auth/better-auth/issues/4386
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
    en: 'User already exists, use another email',
    fr: 'Utilisateur déjà inscrit, utilisez un autre email'
  },
  PASSWORD_TOO_SHORT: {
    en: 'Password too short',
    fr: 'Mot de passe trop court'
  },
  PREMIUM_REQUIRED: {
    en: 'Premium required',
    fr: 'Premium requis'
  },
  INVALID_PASSWORD: {
    en: 'Invalid password',
    fr: 'Mot de passe invalide'
  },
  UNAUTHORIZED: {
    en: 'You must be logged in',
    fr: 'Vous devez être connecté'
  },
  INVALID_EMAIL: {
    en: 'Invalid email',
    fr: 'Email invalide'
  }
} satisfies ErrorTypes

export const getErrorMessage = (
  error: { code?: string; message?: string },
  lang: 'en' | 'fr'
) => {
  if (error.code && error.code in ERROR_CODES) {
    return ERROR_CODES[error.code as keyof typeof ERROR_CODES][lang]
  }

  if (process.env.NODE_ENV === 'development') {
    return error.message
  }

  return 'Une erreur inattendue s’est produite'
}
