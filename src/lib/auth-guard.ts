import { APIError, createAuthMiddleware } from 'better-auth/api'
import { z } from 'zod'
import { getUserNameSchema } from '~/constants/auth'

const getSignUpBodySchema = () => {
  return z.strictObject({
    name: getUserNameSchema(),
    email: z.string(),
    password: z.string(),
    callbackURL: z.string().optional(),
    rememberMe: z.boolean().optional()
  })
}

export const signUpGuard = createAuthMiddleware(async (endpointContext) => {
  if (endpointContext.path !== '/sign-up/email') {
    return
  }

  const result = getSignUpBodySchema().safeParse(endpointContext.body)

  if (!result.success) {
    throw new APIError('BAD_REQUEST', {
      message: z.prettifyError(result.error)
    })
  }

  return {
    context: {
      ...endpointContext,
      body: result.data
    }
  }
})
