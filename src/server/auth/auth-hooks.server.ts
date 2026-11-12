import type { BetterAuthOptions, GenericEndpointContext } from 'better-auth'
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx
} from 'better-auth/api'
import { z } from 'zod'
import * as Sentry from '@sentry/tanstackstart-react'
import { getUserNameSchema } from '~/constants/auth'
import { ALREADY_SUBSCRIBED_ERROR_CODE } from '~/constants/plan'
import { PREMIUM_SUBSCRIPTION_STATUSES } from '~/helpers/subscription'
import { m } from '~/paraglide/messages'

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

const GET_SESSION_RESPONSE_SCHEMA = z.object({
  user: z.object({ id: z.string() })
})

const guardSignUp = (endpointContext: GenericEndpointContext) => {
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
}

const refuseSecondSubscription = async (
  endpointContext: GenericEndpointContext
) => {
  const session = await getSessionFromCtx(endpointContext)

  if (!session) {
    return
  }

  const premiumSubscription = await endpointContext.context.adapter.findOne({
    model: 'subscription',
    where: [
      { field: 'referenceId', value: session.user.id },
      {
        field: 'status',
        operator: 'in',
        value: [...PREMIUM_SUBSCRIPTION_STATUSES]
      }
    ]
  })

  if (premiumSubscription) {
    throw new APIError('BAD_REQUEST', {
      code: ALREADY_SUBSCRIBED_ERROR_CODE,
      message: 'The User already holds a Premium subscription'
    })
  }
}

export const guardAuthEndpoints = createAuthMiddleware(
  async (endpointContext) => {
    if (endpointContext.path === '/sign-up/email') {
      return guardSignUp(endpointContext)
    }

    if (endpointContext.path === '/subscription/upgrade') {
      return refuseSecondSubscription(endpointContext)
    }
  }
)

export const identifySentryUser = createAuthMiddleware(
  async (endpointContext) => {
    const { newSession, session, returned } = endpointContext.context
    const knownSession = newSession ?? session

    if (knownSession) {
      Sentry.setUser({ id: knownSession.user.id })

      return
    }

    if (endpointContext.path !== '/get-session') {
      return
    }

    const response = GET_SESSION_RESPONSE_SCHEMA.safeParse(returned)

    if (response.success) {
      Sentry.setUser({ id: response.data.user.id })
    }
  }
)

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
