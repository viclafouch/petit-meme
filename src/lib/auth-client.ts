import { adminClient, lastLoginMethodClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { stripeClient } from '@better-auth/stripe/client'

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    lastLoginMethodClient(),
    stripeClient({ subscription: true })
  ]
})
