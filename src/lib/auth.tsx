import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
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
import { resendClient } from '@/lib/resend'
import { stripeClient } from '@/lib/stripe'
import { stripe } from '@better-auth/stripe'
import { createServerOnlyFn } from '@tanstack/react-start'
import EmailVerification from '../../emails/email-verification'
import ResetPassword from '../../emails/reset-password'

const getAuthConfig = createServerOnlyFn(() => {
  return betterAuth({
    appName: 'Petit Meme',
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
        await resendClient.emails.send({
          from: 'Petit Meme <hello@petit-meme.io>',
          to: serverEnv.RESEND_EMAIL_TO ?? user.email,
          subject: 'Réinitialise ton mot de passe Petit Mème',
          react: <ResetPassword username={user.name} resetUrl={url} />
        })

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('Sending reset password email to:', user.email, url)
        }
      },
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: ONE_HOUR_IN_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        await resendClient.emails.send({
          from: 'Petit Meme <hello@petit-meme.io>',
          to: serverEnv.RESEND_EMAIL_TO ?? user.email,
          subject: 'Confirme ton inscription à Petit Mème',
          react: (
            <EmailVerification username={user.name} verificationUrl={url} />
          )
        })

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('Sending verification email to:', user.email, url)
        }
      },
      async afterEmailVerification(user) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log(`${user.email} has been successfully verified!`)
        }
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

          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log("Connecting to Twitter's API with profile", user)
          }

          return user
        }
      }
    },
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production',
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
      useSecureCookies: process.env.NODE_ENV === 'production'
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
          ]
        }
      })
    ]
  })
})

export const auth = getAuthConfig()
