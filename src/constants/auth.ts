import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 100

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)

export const passwordWithConfirmationSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema
  })
  .refine(
    (data) => {
      return data.password === data.confirmPassword
    },
    {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword']
    }
  )
