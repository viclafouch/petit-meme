import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { PasswordResetPage } from './-components/password-reset-page'

export const Route = createFileRoute('/_public__root/_default/password/reset')({
  component: PasswordResetPage,
  head: () => {
    return {
      meta: [
        { title: m.auth_reset_password_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
