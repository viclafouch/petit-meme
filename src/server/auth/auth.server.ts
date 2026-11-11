import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { admin, lastLoginMethod } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { stripe } from '@better-auth/stripe'
import { createServerOnlyFn } from '@tanstack/react-start'
import { waitUntil } from '@vercel/functions'
import {
  AUTH_BASE_PATH,
  AUTH_RATE_LIMIT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH
} from '~/constants/auth'
import { PREMIUM_PLAN_NAME } from '~/constants/plan'
import {
  FIVE_MINUTES_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  SEVEN_DAYS_IN_SECONDS
} from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import { ActivityEventType, UserLocale } from '~/db/generated/prisma/enums'
import { EmailVerification } from '~/emails/email-verification'
import { PasswordChangedEmail } from '~/emails/password-changed-email'
import { ResetPassword } from '~/emails/reset-password'
import { emailSubjects } from '~/emails/subjects'
import { WelcomeEmail } from '~/emails/welcome-email'
import {
  matchIsDeployed,
  matchIsProductionDeployment,
  serverEnv
} from '~/env/server.server'
import { getAvatarSlotIdForEmail, resolveAvatarPath } from '~/helpers/avatar'
import { formatDate } from '~/helpers/date'
import { boundProviderName } from '~/helpers/user-name'
import { authLogger, stripeLogger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/server/activity/activity.server'
import {
  identifySentryUser,
  rejectUnverifiedDiscordEmail,
  signUpGuard
} from '~/server/auth/auth-hooks.server'
import { claimEmailVerificationSend } from '~/server/auth/email-verification-quota.server'
import { buildEmailVerificationPath } from '~/server/auth/email-verification.server'
import {
  sendEmail,
  sendEmailInBackground
} from '~/server/platforms/resend.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import {
  notifyPaymentFailed,
  notifySubscriptionConfirmed
} from '~/server/subscription/stripe-webhook.server'
import { cleanupUserData } from '~/server/user/user.server'

const PASSWORD_CHANGED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeStyle: 'short'
}

const updateUserLastActive = async (userId: string) => {
  try {
    await prismaClient.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() }
    })
  } catch (error) {
    authLogger.error({ error }, 'Failed to update lastActiveAt')
  }
}

type SendVerificationEmail = NonNullable<
  NonNullable<BetterAuthOptions['emailVerification']>['sendVerificationEmail']
>

const sendVerificationEmail: SendVerificationEmail = async ({
  user,
  token
}) => {
  const isSendClaimed = await claimEmailVerificationSend(user.id)

  if (!isSendClaimed) {
    return
  }

  const locale = getLocale()
  const verificationPath = buildEmailVerificationPath({ token, locale })
  authLogger.info({ email: user.email }, 'Sending verification email')
  await sendEmail({
    to: user.email,
    subject: emailSubjects[locale].verifyEmail,
    react: EmailVerification({
      verificationUrl: `${serverEnv.VITE_SITE_URL}${verificationPath}`,
      locale
    })
  })
}

const touchUserLastActive = async (session: { userId: string }) => {
  waitUntil(updateUserLastActive(session.userId))
}

const USER_ADDITIONAL_FIELDS = {
  providerAvatar: { type: 'string', required: false, input: false },
  termsAcceptedAt: { type: 'date', required: false, input: false },
  privacyAcceptedAt: { type: 'date', required: false, input: false },
  locale: { type: Object.values(UserLocale), required: false, input: false },
  premiumGrantedAt: { type: 'date', required: false, input: false }
} as const satisfies NonNullable<
  NonNullable<BetterAuthOptions['user']>['additionalFields']
>

const buildUserCreateData = <
  User extends { email: string; image?: string | null }
>(
  user: User
) => {
  const now = new Date()
  const providerAvatar = user.image ?? null

  return {
    ...user,
    image:
      providerAvatar ?? resolveAvatarPath(getAvatarSlotIdForEmail(user.email)),
    providerAvatar,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    locale: getLocale()
  }
}

const getAuthConfig = createServerOnlyFn(() => {
  return betterAuth({
    appName: 'Petit Meme',
    baseURL: serverEnv.VITE_SITE_URL,
    basePath: AUTH_BASE_PATH,
    secret: serverEnv.BETTER_AUTH_SECRET,
    disabledPaths: ['/update-user', '/verify-email'],
    hooks: {
      before: signUpGuard,
      after: identifySentryUser
    },
    database: prismaAdapter(prismaClient, {
      provider: 'postgresql'
    }),
    session: {
      expiresIn: SEVEN_DAYS_IN_SECONDS,
      updateAge: ONE_HOUR_IN_SECONDS,
      cookieCache: {
        enabled: true,
        maxAge: FIVE_MINUTES_IN_SECONDS,
        version: '1'
      }
    },
    user: {
      additionalFields: USER_ADDITIONAL_FIELDS,
      validateUserInfo: rejectUnverifiedDiscordEmail,
      deleteUser: {
        enabled: true
      }
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      sendResetPassword: async ({ user, url }) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Password reset requested')
        await sendEmail({
          to: user.email,
          subject: emailSubjects[locale].resetPassword,
          react: ResetPassword({ resetUrl: url, locale })
        })
      },
      onPasswordReset: async ({ user }) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Password reset completed')
        sendEmailInBackground({
          to: user.email,
          subject: emailSubjects[locale].passwordChanged,
          react: PasswordChangedEmail({
            username: user.name,
            changedAt: formatDate(
              new Date(),
              locale,
              PASSWORD_CHANGED_DATE_OPTIONS
            ),
            locale
          }),
          logMessage: 'Password reset for'
        })
      },
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: ONE_HOUR_IN_SECONDS,
      sendVerificationEmail,
      afterEmailVerification: async (user) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Email verified')
        sendEmailInBackground({
          to: user.email,
          subject: emailSubjects[locale].welcome,
          react: WelcomeEmail({ username: user.name, locale }),
          logMessage: 'Email verified for'
        })
      }
    },
    socialProviders: {
      twitter: {
        clientId: serverEnv.AUTH_TWITTER_ID,
        clientSecret: serverEnv.AUTH_TWITTER_SECRET,
        mapProfileToUser: (profile) => {
          return { name: boundProviderName(profile.data.name) }
        }
      },
      discord: {
        clientId: serverEnv.AUTH_DISCORD_ID,
        clientSecret: serverEnv.AUTH_DISCORD_SECRET,
        mapProfileToUser: (profile) => {
          return {
            name: boundProviderName(profile.global_name || profile.username)
          }
        }
      }
    },
    rateLimit: {
      ...AUTH_RATE_LIMIT,
      enabled: matchIsProductionDeployment()
    },
    advanced: {
      useSecureCookies: matchIsDeployed(),
      ipAddress: {
        ipAddressHeaders: ['x-real-ip']
      },
      database: {
        joins: true
      },
      backgroundTasks: {
        handler: waitUntil
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            return { data: buildUserCreateData(user) }
          },
          after: async (user, context) => {
            recordActivityEvent({
              type: ActivityEventType.SIGNUP,
              actor: { id: user.id },
              headers: context?.headers
            })
          }
        },
        delete: {
          before: async (user) => {
            const dbUser = await prismaClient.user.findUniqueOrThrow({
              where: { id: user.id },
              select: { locale: true }
            })

            await cleanupUserData({
              userId: user.id,
              email: user.email,
              name: user.name,
              locale: dbUser.locale
            })
          }
        }
      },
      session: {
        create: { after: touchUserLastActive },
        update: { after: touchUserLastActive }
      }
    },
    trustedOrigins: [serverEnv.VITE_SITE_URL],
    plugins: [
      admin({ defaultRole: 'user' }),
      lastLoginMethod(),
      stripe({
        stripeClient: getStripeClient(),
        stripeWebhookSecret: serverEnv.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: [
            {
              name: PREMIUM_PLAN_NAME,
              priceId: serverEnv.STRIPE_MONTHLY_PRICE_ID,
              annualDiscountPriceId: serverEnv.STRIPE_ANNUAL_PRICE_ID
            }
          ],
          onSubscriptionComplete: async ({
            event,
            subscription,
            stripeSubscription,
            plan
          }) => {
            await notifySubscriptionConfirmed({
              eventId: event.id,
              userId: subscription.referenceId,
              planName: plan.name,
              billingInterval: subscription.billingInterval,
              stripeSubscription
            })
          }
        },
        onEvent: async (event) => {
          stripeLogger.debug(
            { eventType: event.type, eventId: event.id },
            'Stripe event received'
          )

          if (event.type === 'invoice.payment_failed') {
            await notifyPaymentFailed(event)
          }
        }
      }),
      tanstackStartCookies()
    ]
  })
})

export const auth = getAuthConfig()

export const findFreshSession = (headers: Headers) => {
  return auth.api.getSession({ headers, query: { disableCookieCache: true } })
}

export const findCachedSession = (headers: Headers) => {
  return auth.api.getSession({ headers }).catch(() => {
    return null
  })
}
