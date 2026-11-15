import type { User } from '~/db/generated/prisma/client'

const CREATED_AT = new Date('2026-11-12T00:00:00Z')

export const FRENCH_USER = {
  id: 'user-id',
  name: 'Alan',
  email: 'alan@example.test',
  emailVerified: true,
  image: null,
  providerAvatar: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  generationCount: 0,
  role: 'user',
  banned: false,
  banReason: null,
  banExpires: null,
  stripeCustomerId: 'cus_test',
  termsAcceptedAt: CREATED_AT,
  privacyAcceptedAt: CREATED_AT,
  verificationReminderSent: false,
  isAnonymized: false,
  locale: 'fr',
  lastActiveAt: null,
  premiumGrantedAt: null,
  verificationEmailCount: 0,
  verificationEmailWindowStart: null
} as const satisfies User
