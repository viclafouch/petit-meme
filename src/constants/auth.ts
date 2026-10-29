import type { BetterAuthOptions } from 'better-auth'
import { z } from 'zod'
import { m } from '~/paraglide/messages.js'

export const AUTH_PROVIDER_IDS = [
  'credential',
  'twitter',
  'discord'
] as const satisfies readonly string[]

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number]

const authProviderIdSet = new Set<string>(AUTH_PROVIDER_IDS)

export const matchIsAuthProviderId = (
  value: string
): value is AuthProviderId => {
  return authProviderIdSet.has(value)
}

export const PLACEHOLDER_EMAIL_DOMAIN = 'placeholder.invalid'

export const AUTH_BASE_PATH = '/api/auth'

export const AUTH_RATE_LIMIT = {
  window: 60,
  max: 100,
  storage: 'database',
  customRules: {
    '/get-session': false,
    '/sign-in/email': { window: 300, max: 10 },
    '/sign-up/email': { window: 3600, max: 3 },
    '/forget-password': { window: 3600, max: 3 },
    '/change-password': { window: 900, max: 5 },
    '/send-verification-email': { window: 60, max: 2 }
  }
} as const satisfies BetterAuthOptions['rateLimit']

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 100

export const USER_NAME_MAX_LENGTH = 50

export const UNVERIFIED_RETENTION_DAYS = 30
export const INACTIVITY_ANONYMIZATION_YEARS = 3
export const LAST_ACTIVE_AT_TRACKING_START = new Date('2026-04-06T21:57:05Z')

export const getEmailSchema = () => {
  return z.email({ error: m.validation_email_invalid() })
}

export const getUserNameSchema = () => {
  return z
    .string()
    .trim()
    .min(1, { error: m.validation_name_required() })
    .max(USER_NAME_MAX_LENGTH, {
      error: m.validation_name_too_long({ maxLength: USER_NAME_MAX_LENGTH })
    })
}

export const getPasswordSchema = () => {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      error: m.validation_password_too_short({
        minLength: PASSWORD_MIN_LENGTH
      })
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: m.validation_password_too_long({
        maxLength: PASSWORD_MAX_LENGTH
      })
    })
}

export const getPasswordWithConfirmationSchema = () => {
  return z
    .object({
      password: getPasswordSchema(),
      confirmPassword: getPasswordSchema()
    })
    .refine(
      (data) => {
        return data.password === data.confirmPassword
      },
      {
        error: m.validation_passwords_dont_match(),
        path: ['confirmPassword']
      }
    )
}
