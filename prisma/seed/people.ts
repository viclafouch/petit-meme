import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import type Stripe from 'stripe'
import { PREMIUM_PLAN_NAME } from '~/constants/plan'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { UserLocale } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import {
  fromNullableUnixSeconds,
  fromUnixSeconds,
  getStripeClient
} from '~/server/platforms/stripe.server'
import {
  randomChance,
  randomDateBetween,
  randomInteger,
  randomPick
} from './random'

const FIGURANT_COUNT = 24
const SIGNUP_WINDOW_DAYS = 90
const FRENCH_FIGURANT_SHARE = 0.8
const VERIFIED_FIGURANT_SHARE = 0.85
const STRIPE_TEST_CARD = 'pm_card_visa'

const FIRST_NAMES = [
  'Léa',
  'Hugo',
  'Chloé',
  'Lucas',
  'Inès',
  'Nathan',
  'Manon',
  'Yanis',
  'Camille',
  'Théo',
  'Sarah',
  'Enzo',
  'Jade',
  'Noah',
  'Emma',
  'Liam'
] as const

const LAST_NAMES = [
  'Martin',
  'Bernard',
  'Dubois',
  'Moreau',
  'Laurent',
  'Garcia',
  'Roux',
  'Fournier',
  'Smith',
  'Taylor'
] as const

type PersonaPlan = 'free' | 'paid-monthly' | 'paid-annual-ending' | 'offered'

type Persona = {
  email: string
  name: string
  role: 'admin' | 'user'
  locale: UserLocale
  plan: PersonaPlan
  signedUpDaysAgo: number
  emailVerified: boolean
  isBanned: boolean
}

const PERSONAS = [
  {
    email: 'admin@petit-meme.dev',
    name: 'Admin',
    role: 'admin',
    locale: 'fr',
    plan: 'free',
    signedUpDaysAgo: 120,
    emailVerified: true,
    isBanned: false
  },
  {
    email: 'user@petit-meme.dev',
    name: 'Léa Free',
    role: 'user',
    locale: 'fr',
    plan: 'free',
    signedUpDaysAgo: 40,
    emailVerified: true,
    isBanned: false
  },
  {
    email: 'premium@petit-meme.dev',
    name: 'Hugo Premium',
    role: 'user',
    locale: 'fr',
    plan: 'paid-monthly',
    signedUpDaysAgo: 60,
    emailVerified: true,
    isBanned: false
  },
  {
    email: 'ending@petit-meme.dev',
    name: 'Emma Ending',
    role: 'user',
    locale: 'en',
    plan: 'paid-annual-ending',
    signedUpDaysAgo: 75,
    emailVerified: true,
    isBanned: false
  },
  {
    email: 'offered@petit-meme.dev',
    name: 'Chloé Offered',
    role: 'user',
    locale: 'fr',
    plan: 'offered',
    signedUpDaysAgo: 30,
    emailVerified: true,
    isBanned: false
  }
] as const satisfies readonly Persona[]

export const SEED_LOGIN_HINT =
  'admin@, user@, premium@, ending@ and offered@petit-meme.dev, plus figurant-01@ to figurant-24@petit-meme.dev'

export type SeededPerson = {
  id: string
  locale: UserLocale
  createdAt: Date
  isPremium: boolean
  isAdmin: boolean
}

const buildFigurant = (index: number): Persona => {
  const number = String(index + 1).padStart(2, '0')

  return {
    email: `figurant-${number}@petit-meme.dev`,
    name: `${randomPick(FIRST_NAMES)} ${randomPick(LAST_NAMES)}`,
    role: 'user',
    locale: randomChance(FRENCH_FIGURANT_SHARE) ? 'fr' : 'en',
    plan: 'free',
    signedUpDaysAgo: randomInteger(0, SIGNUP_WINDOW_DAYS),
    emailVerified: randomChance(VERIFIED_FIGURANT_SHARE),
    isBanned: index === FIGURANT_COUNT - 1
  }
}

const matchIsPaid = (plan: PersonaPlan) => {
  return plan === 'paid-monthly' || plan === 'paid-annual-ending'
}

const createStripeSubscription = async (
  customerId: string,
  plan: PersonaPlan
) => {
  const isAnnual = plan === 'paid-annual-ending'
  const subscription = await getStripeClient().subscriptions.create({
    customer: customerId,
    items: [
      {
        price: isAnnual
          ? serverEnv.STRIPE_ANNUAL_PRICE_ID
          : serverEnv.STRIPE_MONTHLY_PRICE_ID
      }
    ]
  })

  if (!isAnnual) {
    return subscription
  }

  return getStripeClient().subscriptions.update(subscription.id, {
    cancel_at_period_end: true
  })
}

const recordSubscription = async (
  userId: string,
  subscription: Stripe.Subscription
) => {
  const [item] = subscription.items.data

  await prismaClient.subscription.create({
    data: {
      id: randomUUID(),
      plan: PREMIUM_PLAN_NAME,
      referenceId: userId,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      periodStart: item ? fromUnixSeconds(item.current_period_start) : null,
      periodEnd: item ? fromUnixSeconds(item.current_period_end) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: fromNullableUnixSeconds(subscription.cancel_at),
      billingInterval: item?.price.recurring?.interval ?? null,
      seats: 1
    }
  })
}

const createPerson = async (persona: Persona, passwordHash: string) => {
  const id = randomUUID()
  const isPaid = matchIsPaid(persona.plan)
  const now = new Date()
  const createdAt = randomDateBetween(
    new Date(now.getTime() - (persona.signedUpDaysAgo + 1) * DAY),
    new Date(now.getTime() - persona.signedUpDaysAgo * DAY)
  )
  const customer = await getStripeClient().customers.create({
    email: persona.email,
    name: persona.name,
    metadata: { userId: id },
    preferred_locales: [persona.locale],
    ...(isPaid
      ? {
          payment_method: STRIPE_TEST_CARD,
          invoice_settings: { default_payment_method: STRIPE_TEST_CARD }
        }
      : {})
  })

  await prismaClient.user.create({
    data: {
      id,
      name: persona.name,
      email: persona.email,
      emailVerified: persona.emailVerified,
      role: persona.role,
      locale: persona.locale,
      stripeCustomerId: customer.id,
      createdAt,
      updatedAt: createdAt,
      termsAcceptedAt: createdAt,
      privacyAcceptedAt: createdAt,
      lastActiveAt: randomDateBetween(createdAt, now),
      premiumGrantedAt: persona.plan === 'offered' ? createdAt : null,
      banned: persona.isBanned,
      banReason: persona.isBanned ? 'Spam' : null,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: 'credential',
          password: passwordHash,
          createdAt,
          updatedAt: createdAt
        }
      }
    }
  })

  if (isPaid) {
    await recordSubscription(
      id,
      await createStripeSubscription(customer.id, persona.plan)
    )
  }

  return {
    id,
    locale: persona.locale,
    createdAt,
    isPremium: persona.role === 'admin' || persona.plan !== 'free',
    isAdmin: persona.role === 'admin'
  } satisfies SeededPerson
}

export const createPeople = async (password: string) => {
  const passwordHash = await hashPassword(password)
  const personas = [
    ...PERSONAS,
    ...Array.from({ length: FIGURANT_COUNT }, (_, index) => {
      return buildFigurant(index)
    })
  ]
  const people: SeededPerson[] = []

  for (const persona of personas) {
    // oxlint-disable-next-line no-await-in-loop -- sequential creation keeps under the Stripe rate limit
    people.push(await createPerson(persona, passwordHash))
  }

  return people
}
