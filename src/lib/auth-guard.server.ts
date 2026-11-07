import type { BetterAuthOptions } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { z } from 'zod'
import { getUserNameSchema } from '~/constants/auth'
import { m } from '~/paraglide/messages.js'

type ValidateUserInfo = NonNullable<
  NonNullable<BetterAuthOptions['user']>['validateUserInfo']
>

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

export const rejectUnverifiedDiscordEmail: ValidateUserInfo = ({
  user,
  source
}) => {
  if (source.oauth?.providerId !== 'discord' || user.emailVerified) {
    return
  }

  return {
    error: 'email_not_verified',
    errorDescription: m.auth_discord_email_not_verified()
  }
}
