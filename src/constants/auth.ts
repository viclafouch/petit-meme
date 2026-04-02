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

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 100

export const getEmailSchema = () => {
  return z.email({ message: m.validation_email_invalid() })
}

export const getPasswordSchema = () => {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      message: m.validation_password_too_short({
        minLength: PASSWORD_MIN_LENGTH
      })
    })
    .max(PASSWORD_MAX_LENGTH, {
      message: m.validation_password_too_long({
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
        message: m.validation_passwords_dont_match(),
        path: ['confirmPassword']
      }
    )
}
