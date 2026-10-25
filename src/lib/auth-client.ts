import {
  adminClient,
  inferAdditionalFields,
  lastLoginMethodClient
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { stripeClient } from '@better-auth/stripe/client'
import type { auth } from '~/lib/auth'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    lastLoginMethodClient(),
    stripeClient({ subscription: true })
  ]
})
