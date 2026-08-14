import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { admin, lastLoginMethod } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type Stripe from 'stripe'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { stripe } from '@better-auth/stripe'
import { createServerOnlyFn } from '@tanstack/react-start'
// Vercel-specific: replace with platform equivalent if migrating (e.g. Railway)
import { waitUntil } from '@vercel/functions'
import { prismaClient } from '~/db'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '~/constants/auth'
import {
  FIVE_MINUTES_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  SEVEN_DAYS_IN_SECONDS
} from '~/constants/time'
import { ActivityEventType, UserLocale } from '~/db/generated/prisma/enums'
import { emailSubjects } from '~/emails/subjects'
import { clientEnv } from '~/env/client'
import { IS_DEPLOYED, IS_PRODUCTION_DEPLOYMENT, serverEnv } from '~/env/server'
import { getAvatarSlotIdForEmail, resolveAvatarPath } from '~/helpers/avatar'
import { formatDate } from '~/helpers/date'
import { formatCentsToEuros } from '~/helpers/number'
import { authLogger, stripeLogger } from '~/lib/logger'
import { sendEmailAsync } from '~/lib/resend'
import { captureWithFeature } from '~/lib/sentry'
import { stripeClient } from '~/lib/stripe'
import { getLocale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/utils/activity-event'
import { cleanupUserData } from '~/utils/user-cleanup'
import EmailVerification from '../emails/email-verification'
import PasswordChangedEmail from '../emails/password-changed-email'
import PaymentFailedEmail from '../emails/payment-failed-email'
import ResetPassword from '../emails/reset-password'
import SubscriptionConfirmedEmail from '../emails/subscription-confirmed-email'
import WelcomeEmail from '../emails/welcome-email'

const PASSWORD_CHANGED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeStyle: 'short'
}

const handlePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer

  if (typeof customerId !== 'string') {
    return
  }

  stripeLogger.warn({ customerId, eventId: event.id }, 'Payment failed')

  const user = await prismaClient.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { email: true, name: true, locale: true }
  })

  if (!user) {
    stripeLogger.warn(
      { customerId, eventId: event.id },
      'Payment failed but user not found'
    )
    captureWithFeature(
      new Error(`Payment failed but user not found for customer ${customerId}`),
      'stripe-payment'
    )

    return
  }

  let portalSession: Awaited<
    ReturnType<typeof stripeClient.billingPortal.sessions.create>
  >

  try {
    portalSession = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${clientEnv.VITE_SITE_URL}/settings`
    })
  } catch (error) {
    captureWithFeature(error, 'stripe-billing-portal')
    stripeLogger.error(
      { error, customerId, eventId: event.id },
      'Failed to create billing portal session'
    )

    return
  }

  sendEmailAsync({
    to: user.email,
    subject: emailSubjects[user.locale].paymentFailed,
    react: (
      <PaymentFailedEmail
        username={user.name}
        billingPortalUrl={portalSession.url}
        locale={user.locale}
      />
    ),
    logMessage: 'Sending payment failed email to'
  })
}

const touchUserLastActive = async (session: { userId: string }) => {
  waitUntil(
    prismaClient.user
      .update({
        where: { id: session.userId },
        data: { lastActiveAt: new Date() }
      })
      .catch((error) => {
        authLogger.error({ error }, 'Failed to update lastActiveAt')
      })
  )
}

const USER_ADDITIONAL_FIELDS = {
  providerAvatar: { type: 'string', required: false, input: false },
  termsAcceptedAt: { type: 'date', required: false, input: false },
  privacyAcceptedAt: { type: 'date', required: false, input: false },
  locale: { type: Object.values(UserLocale), required: false, input: false }
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
    baseURL: clientEnv.VITE_SITE_URL,
    basePath: '/api/auth',
    secret: serverEnv.BETTER_AUTH_SECRET,
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
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
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
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      sendResetPassword: async ({ user, url }) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Password reset requested')
        sendEmailAsync({
          to: user.email,
          subject: emailSubjects[locale].resetPassword,
          react: (
            <ResetPassword
              username={user.name}
              resetUrl={url}
              locale={locale}
            />
          ),
          logMessage: 'Sending reset password email to'
        })
      },
      onPasswordReset: async ({ user }) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Password reset completed')
        sendEmailAsync({
          to: user.email,
          subject: emailSubjects[locale].passwordChanged,
          react: (
            <PasswordChangedEmail
              username={user.name}
              changedAt={formatDate(
                new Date(),
                locale,
                PASSWORD_CHANGED_DATE_OPTIONS
              )}
              locale={locale}
            />
          ),
          logMessage: 'Password reset for'
        })
      },
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: ONE_HOUR_IN_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Sending verification email')
        sendEmailAsync({
          to: user.email,
          subject: emailSubjects[locale].verifyEmail,
          react: (
            <EmailVerification
              username={user.name}
              verificationUrl={url}
              locale={locale}
            />
          ),
          logMessage: 'Sending verification email to'
        })
      },
      afterEmailVerification: async (user) => {
        const locale = getLocale()
        authLogger.info({ email: user.email }, 'Email verified')
        sendEmailAsync({
          to: user.email,
          subject: emailSubjects[locale].welcome,
          react: <WelcomeEmail username={user.name} locale={locale} />,
          logMessage: 'Email verified for'
        })
      }
    },
    socialProviders: {
      twitter: {
        clientId: serverEnv.AUTH_TWITTER_ID,
        clientSecret: serverEnv.AUTH_TWITTER_SECRET
      },
      discord: {
        clientId: serverEnv.AUTH_DISCORD_ID,
        clientSecret: serverEnv.AUTH_DISCORD_SECRET
      }
    },
    rateLimit: {
      enabled: IS_PRODUCTION_DEPLOYMENT,
      window: 60,
      max: 100,
      storage: 'memory',
      customRules: {
        '/sign-in/email': { window: 300, max: 10 },
        '/sign-up/email': { window: 3600, max: 3 },
        '/forget-password': { window: 3600, max: 3 },
        '/change-password': { window: 900, max: 5 },
        '/send-verification-email': { window: 60, max: 2 }
      }
    },
    advanced: {
      useSecureCookies: IS_DEPLOYED,
      // Vercel-specific: keeps serverless function alive after response
      backgroundTasks: {
        handler: (promise) => {
          waitUntil(promise)
        }
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
        }
      },
      session: {
        create: { after: touchUserLastActive },
        update: { after: touchUserLastActive }
      }
    },
    trustedOrigins: [clientEnv.VITE_SITE_URL],
    plugins: [
      admin({ defaultRole: 'user' }),
      lastLoginMethod(),
      tanstackStartCookies(),
      stripe({
        stripeClient,
        stripeWebhookSecret: serverEnv.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: [
            {
              name: 'premium',
              priceId: serverEnv.STRIPE_MONTHLY_PRICE_ID
            },
            {
              name: 'premium-annual',
              priceId: serverEnv.STRIPE_ANNUAL_PRICE_ID
            }
          ],
          onSubscriptionComplete: async ({
            subscription,
            stripeSubscription,
            plan
          }) => {
            stripeLogger.info(
              { userId: subscription.referenceId, plan: plan.name },
              'Subscription completed'
            )

            const user = await prismaClient.user.findUnique({
              where: { id: subscription.referenceId },
              select: { email: true, name: true, locale: true, role: true }
            })

            if (!user) {
              return
            }

            recordActivityEvent({
              type: ActivityEventType.SUBSCRIPTION,
              actor: { id: subscription.referenceId, role: user.role },
              metadata: { plan: plan.name }
            })

            const stripePrice = stripeSubscription.items.data[0]?.price
            const priceCents = stripePrice?.unit_amount ?? 0
            const isAnnual = stripePrice?.recurring?.interval === 'year'

            const { locale } = user
            const formattedAmount = formatCentsToEuros(priceCents, {
              locale
            })

            sendEmailAsync({
              to: user.email,
              subject: emailSubjects[locale].subscriptionConfirmed,
              react: (
                <SubscriptionConfirmedEmail
                  username={user.name}
                  planTitle="Premium"
                  amount={formattedAmount}
                  isAnnual={isAnnual}
                  locale={locale}
                />
              ),
              logMessage: 'Sending subscription confirmed email to'
            })
          }
        },
        onEvent: async (event) => {
          stripeLogger.debug(
            { eventType: event.type, eventId: event.id },
            'Stripe event received'
          )

          if (event.type === 'invoice.payment_failed') {
            await handlePaymentFailed(event)
          }
        }
      })
    ]
  })
})

export const auth = getAuthConfig()
