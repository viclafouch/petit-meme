import { z } from 'zod'
import { m } from '@/paraglide/messages.js'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 100

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)

export const getPasswordWithConfirmationSchema = () => {
  return z
    .object({
      password: passwordSchema,
      confirmPassword: passwordSchema
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
