import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type Stripe from 'stripe'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/auth'
import {
  FIVE_MINUTES_IN_SECONDS,
  ONE_DAY_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  SEVEN_DAYS_IN_SECONDS
} from '@/constants/time'
import { prismaClient } from '@/db'
import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { capitalize } from '@/helpers/format'
import { maskEmail } from '@/helpers/mask-email'
import { formatCentsToEuros } from '@/helpers/number'
import { sendEmailAsync } from '@/lib/resend.server'
import { stripeClient } from '@/lib/stripe'
import { stripe } from '@better-auth/stripe'
import { createServerOnlyFn } from '@tanstack/react-start'
import AccountDeletedEmail from '../emails/account-deleted-email'
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
        maxAge: FIVE_MINUTES_IN_SECONDS
      }
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          sendEmailAsync({
            to: user.email,
            subject: 'Ton compte Petit Mème a été supprimé',
            react: <AccountDeletedEmail username={user.name} />,
            logMessage: 'Sending account deleted email to'
          })

          const dbUser = await prismaClient.user.findUnique({
            where: { id: user.id },
            select: { stripeCustomerId: true }
          })

          if (dbUser?.stripeCustomerId) {
            await stripeClient.customers.del(dbUser.stripeCustomerId)
          }

          await prismaClient.subscription.deleteMany({
            where: { referenceId: user.id }
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
        sendEmailAsync({
          to: user.email,
          subject: 'Réinitialise ton mot de passe Petit Mème',
          react: <ResetPassword username={user.name} resetUrl={url} />,
          logMessage: 'Sending reset password email to'
        })
      },
      onPasswordReset: async ({ user }) => {
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
        sendEmailAsync({
          to: user.email,
          subject: 'Confirme ton inscription à Petit Mème',
          react: (
            <EmailVerification username={user.name} verificationUrl={url} />
          ),
          logMessage: 'Sending verification email to'
        })
      },
      async afterEmailVerification(user) {
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
        clientSecret: serverEnv.AUTH_TWITTER_SECRET,
        mapProfileToUser: async (profile) => {
          const user = {
            name: profile.data.username,
            email: profile.data.email,
            image: profile.data.profile_image_url
          }

          // eslint-disable-next-line no-console
          console.log(`[auth] Twitter login for ${maskEmail(user.email ?? '')}`)

          return user
        }
      }
    },
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production',
      window: 60,
      max: 100,
      storage: 'database',
      customRules: {
        '/sign-in/email': { window: 300, max: 10 },
        '/sign-up/email': { window: 3600, max: 3 },
        '/forget-password': { window: 3600, max: 3 },
        '/change-password': { window: 900, max: 5 },
        '/send-verification-email': { window: 60, max: 2 }
      }
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production'
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
      admin(),
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
              priceId: serverEnv.STRIPE_PRICE_ID
            }
          ],
          onSubscriptionComplete: async ({
            subscription,
            stripeSubscription,
            plan
          }) => {
            const user = await prismaClient.user.findUnique({
              where: { id: subscription.referenceId },
              select: { email: true, name: true }
            })

            if (!user) {
              return
            }

            const priceCents =
              stripeSubscription.items.data[0]?.price.unit_amount ?? 0

            const formattedAmount = formatCentsToEuros(priceCents)

            sendEmailAsync({
              to: user.email,
              subject: 'Ton abonnement Premium Petit Mème est activé !',
              react: (
                <SubscriptionConfirmedEmail
                  username={user.name}
                  planTitle={capitalize(plan.name)}
                  amount={`${formattedAmount}/mois`}
                />
              ),
              logMessage: 'Sending subscription confirmed email to'
            })
          }
        },
        onEvent: async (event) => {
          if (event.type !== 'invoice.payment_failed') {
            return
          }

          const invoice = event.data.object as Stripe.Invoice
          const customerId = invoice.customer

          if (typeof customerId !== 'string') {
            return
          }

          const user = await prismaClient.user.findFirst({
            where: { stripeCustomerId: customerId },
            select: { email: true, name: true }
          })

          if (!user) {
            return
          }

          const portalSession =
            await stripeClient.billingPortal.sessions.create({
              customer: customerId,
              // eslint-disable-next-line camelcase
              return_url: `${clientEnv.VITE_SITE_URL}/settings`
            })

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
      })
    ]
  })
})

export const auth = getAuthConfig()
