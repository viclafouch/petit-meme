import type { BetterAuthPlanName } from '~/constants/plan'
import { FREE_PLAN_MAX_FAVORITES } from '~/constants/plan'
import type { Meme, User } from '~/db/generated/prisma/client'
import { E2E_FILLER_MEMES, E2E_NAMED_MEMES } from './content'

export const E2E_EMAIL_DOMAIN = 'e2e.petitmeme.invalid'
export const E2E_PASSWORD = 'e2e-password-2026'
export const E2E_WRONG_PASSWORD = 'not-the-e2e-password'

export type E2eRole = Pick<User, 'id' | 'name' | 'email' | 'emailVerified'> & {
  premiumPlan?: BetterAuthPlanName
  bookmarkedMemeIds?: readonly Meme['id'][]
}

const CAPPED_BOOKMARK_MEME_IDS = E2E_FILLER_MEMES.slice(
  0,
  FREE_PLAN_MAX_FAVORITES
).map((meme) => {
  return meme.id
})

// One role per scenario that leaves a mark on its own account. Sharing a role
// between a checkout and a deletion would make the second test depend on the
// order of the first.
export const E2E_ROLES = {
  free: {
    id: 'e2e-user-free',
    name: 'E2E Free',
    email: `e2e-free@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  checkout: {
    id: 'e2e-user-checkout',
    name: 'E2E Checkout',
    email: `e2e-checkout@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  checkoutAnnual: {
    id: 'e2e-user-checkout-annual',
    name: 'E2E Checkout Annual',
    email: `e2e-checkout-annual@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  passwordReset: {
    id: 'e2e-user-password-reset',
    name: 'E2E Password Reset',
    email: `e2e-password-reset@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  deletion: {
    id: 'e2e-user-deletion',
    name: 'E2E Deletion',
    email: `e2e-deletion@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  deletionRefused: {
    id: 'e2e-user-deletion-refused',
    name: 'E2E Deletion Refused',
    email: `e2e-deletion-refused@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  premium: {
    id: 'e2e-user-premium',
    name: 'E2E Premium',
    email: `e2e-premium@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    premiumPlan: 'premium'
  },
  bookmark: {
    id: 'e2e-user-bookmark',
    name: 'E2E Bookmark',
    email: `e2e-bookmark@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  bookmarkCapped: {
    id: 'e2e-user-bookmark-capped',
    name: 'E2E Bookmark Capped',
    email: `e2e-bookmark-capped@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    bookmarkedMemeIds: CAPPED_BOOKMARK_MEME_IDS
  },
  favorites: {
    id: 'e2e-user-favorites',
    name: 'E2E Favorites',
    email: `e2e-favorites@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    bookmarkedMemeIds: [
      E2E_NAMED_MEMES.english.id,
      E2E_NAMED_MEMES.universal.id
    ]
  },
  // Never signed in, so it gets no storage state: the login screen is the only
  // place that has something to say about an unverified account.
  unverified: {
    id: 'e2e-user-unverified',
    name: 'E2E Unverified',
    email: `e2e-unverified@${E2E_EMAIL_DOMAIN}`,
    emailVerified: false
  }
} as const satisfies Record<string, E2eRole>

export type E2eRoleName = keyof typeof E2E_ROLES

// https://docs.stripe.com/testing
export const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/34',
  cvc: '123'
} as const
