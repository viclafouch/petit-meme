import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { CheckoutSuccessPage } from './-components/checkout-success-page'

export const Route = createFileRoute(
  '/_public__root/_default/checkout/success'
)({
  component: CheckoutSuccessPage,
  head: () => {
    return {
      meta: [
        { title: m.checkout_success_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
