import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { VerifyEmailPage } from './-components/verify-email-page'

export const Route = createFileRoute('/_public__root/_default/verify-email')({
  validateSearch: (search) => {
    return z
      .object({
        // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
        token: z.string().optional().catch(undefined)
      })
      .parse(search)
  },
  component: VerifyEmailPage,
  head: () => {
    return {
      meta: [
        { title: m.auth_verify_email_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
