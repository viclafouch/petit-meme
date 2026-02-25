import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { getActiveSubscriptionQueryOpts } from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { useShowDialog } from '@/stores/dialog.store'
import { useQueryClient } from '@tanstack/react-query'
import type { LinkOptions } from '@tanstack/react-router'
import { useRouteContext } from '@tanstack/react-router'

export const useStripeCheckout = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const queryClient = useQueryClient()

  const goToBillingPortal = async () => {
    if (!user) {
      showDialog('auth', {})

      return
    }

    try {
      const promise = authClient.subscription.billingPortal({
        locale: 'fr',
        returnUrl: '/settings' as LinkOptions['to']
      })
      toast.promise(promise, { loading: 'Chargement...' })
      const { error } = await promise

      if (error) {
        throw error
      }
    } catch (error) {
      captureWithFeature(error, 'stripe-checkout')
      toast.error('Une erreur est survenue')
    }
  }

  const checkoutPremium = async () => {
    if (!user) {
      showDialog('auth', {})

      return
    }

    try {
      const promise = new Promise((resolve) => {
        setTimeout(resolve, 1)
      })
        .then(() => {
          return queryClient.fetchQuery(getActiveSubscriptionQueryOpts())
        })
        .then(async (activeSubscription) => {
          if (!activeSubscription) {
            const { error } = await authClient.subscription.upgrade({
              plan: 'premium',
              successUrl: '/checkout/success' satisfies LinkOptions['to'],
              cancelUrl: '/pricing' satisfies LinkOptions['to'],
              returnUrl: '/settings' as LinkOptions['to']
            })

            if (error) {
              return Promise.reject(error)
            }
          }

          return Promise.resolve(
            toast.success('Vous avez déjà un abonnement en cours !')
          )
        })

      toast.promise(promise, { loading: 'Chargement...' })

      await promise
    } catch (error) {
      captureWithFeature(error, 'stripe-checkout')
      toast.error('Une erreur est survenue')
    }
  }

  return {
    goToBillingPortal,
    checkoutPremium
  }
}
