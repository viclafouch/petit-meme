import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type Stripe from 'stripe'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/auth'
import { IS_PRODUCTION } from '@/constants/env'
import {
  FIVE_MINUTES_IN_SECONDS,
  ONE_DAY_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  SEVEN_DAYS_IN_SECONDS
} from '@/constants/time'
import { prismaClient } from '@/db'
import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { formatCentsToEuros } from '@/helpers/number'
import { authLogger, stripeLogger } from '@/lib/logger'
import { sendEmailAsync } from '@/lib/resend'
import { captureWithFeature } from '@/lib/sentry'
import { stripeClient } from '@/lib/stripe'
import { cleanupUserData } from '@/utils/user-cleanup'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { stripe } from '@better-auth/stripe'
import { createServerOnlyFn } from '@tanstack/react-start'
// Vercel-specific: replace with platform equivalent if migrating (e.g. Railway)
import { waitUntil } from '@vercel/functions'
import EmailVerification from '../emails/email-verification'
import PasswordChangedEmail from '../emails/password-changed-email'
import PaymentFailedEmail from '../emails/payment-failed-email'
import ResetPassword from '../emails/reset-password'
import SubscriptionConfirmedEmail from '../emails/subscription-confirmed-email'
import WelcomeEmail from '../emails/welcome-email'

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(date)
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
    select: { email: true, name: true }
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
      // eslint-disable-next-line camelcase -- Stripe API uses snake_case
      return_url: `${clientEnv.VITE_SITE_URL}/settings`
    })
  } catch (error) {
    captureWithFeature(error, 'stripe-billing-portal')
    stripeLogger.error(
      { err: error, customerId, eventId: event.id },
      'Failed to create billing portal session'
    )

    return
  }

  sendEmailAsync({
    to: user.email,
    subject: 'Échec de paiement pour ton abonnement Petit Mème',
    react: (
      <PaymentFailedEmail
        username={user.name}
        billingPortalUrl={portalSession.url}
      />
    ),
    logMessage: 'Sending payment failed email to'
  })
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
      updateAge: ONE_DAY_IN_SECONDS,
      cookieCache: {
        enabled: true,
        maxAge: FIVE_MINUTES_IN_SECONDS,
        version: '1'
      }
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await cleanupUserData({
            userId: user.id,
            email: user.email,
            name: user.name
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
        authLogger.info({ email: user.email }, 'Password reset requested')
        sendEmailAsync({
          to: user.email,
          subject: 'Réinitialise ton mot de passe Petit Mème',
          react: <ResetPassword username={user.name} resetUrl={url} />,
          logMessage: 'Sending reset password email to'
        })
      },
      onPasswordReset: async ({ user }) => {
        authLogger.info({ email: user.email }, 'Password reset completed')
        sendEmailAsync({
          to: user.email,
          subject: 'Ton mot de passe Petit Mème a été modifié',
          react: (
            <PasswordChangedEmail
              username={user.name}
              changedAt={formatDate(new Date())}
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
        authLogger.info({ email: user.email }, 'Sending verification email')
        sendEmailAsync({
          to: user.email,
          subject: 'Confirme ton inscription à Petit Mème',
          react: (
            <EmailVerification username={user.name} verificationUrl={url} />
          ),
          logMessage: 'Sending verification email to'
        })
      },
      afterEmailVerification: async (user) => {
        authLogger.info({ email: user.email }, 'Email verified')
        sendEmailAsync({
          to: user.email,
          subject: 'Bienvenue sur Petit Mème !',
          react: <WelcomeEmail username={user.name} />,
          logMessage: 'Email verified for'
        })
      }
    },
    socialProviders: {
      twitter: {
        clientId: serverEnv.AUTH_TWITTER_ID,
        clientSecret: serverEnv.AUTH_TWITTER_SECRET
      }
    },
    rateLimit: {
      enabled: IS_PRODUCTION,
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
      useSecureCookies: IS_PRODUCTION,
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
            const now = new Date()

            return {
              data: {
                ...user,
                termsAcceptedAt: now,
                privacyAcceptedAt: now
              }
            }
          }
        }
      }
    },
    trustedOrigins: [clientEnv.VITE_SITE_URL],
    plugins: [
      admin({ defaultRole: 'user' }),
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
              select: { email: true, name: true }
            })

            if (!user) {
              return
            }

            const stripePrice = stripeSubscription.items.data[0]?.price
            const priceCents = stripePrice?.unit_amount ?? 0
            const isAnnual = stripePrice?.recurring?.interval === 'year'

            const formattedAmount = formatCentsToEuros(priceCents)
            const periodSuffix = isAnnual ? '/an' : '/mois'

            sendEmailAsync({
              to: user.email,
              subject: 'Ton abonnement Premium Petit Mème est activé !',
              react: (
                <SubscriptionConfirmedEmail
                  username={user.name}
                  planTitle="Premium"
                  amount={`${formattedAmount}${periodSuffix}`}
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
