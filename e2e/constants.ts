import type { User } from '~/db/generated/prisma/client'

export const E2E_EMAIL_DOMAIN = 'e2e.petitmeme.invalid'
export const E2E_PASSWORD = 'e2e-password-2026'

export type E2eRole = Pick<User, 'id' | 'name' | 'email'>

export const E2E_ROLES = {
  free: {
    id: 'e2e-user-free',
    name: 'E2E Free',
    email: `e2e-free@${E2E_EMAIL_DOMAIN}`
  },
  checkout: {
    id: 'e2e-user-checkout',
    name: 'E2E Checkout',
    email: `e2e-checkout@${E2E_EMAIL_DOMAIN}`
  }
} as const satisfies Record<string, E2eRole>

export type E2eRoleName = keyof typeof E2E_ROLES

// https://docs.stripe.com/testing
export const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/34',
  cvc: '123'
} as const
