import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { CreateNewPasswordPage } from './-components/create-new-password-page'

export const Route = createFileRoute(
  '/_public__root/_default/password/create-new'
)({
  validateSearch: (search) => {
    return z
      .object({
        // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
        token: z.string().optional().catch(undefined),
        // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
        error: z.literal('INVALID_TOKEN').optional().catch(undefined)
      })
      .parse(search)
  },
  component: CreateNewPasswordPage,
  head: () => {
    return {
      meta: [
        { title: m.auth_new_password_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
