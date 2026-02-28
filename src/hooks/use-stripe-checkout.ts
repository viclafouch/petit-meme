import { toast } from 'sonner'
import { type BillingPeriod, PREMIUM_PLAN } from '@/constants/plan'
import { authClient } from '@/lib/auth-client'
import { getActiveSubscriptionQueryOpts } from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { useShowDialog } from '@/stores/dialog.store'
import { useQueryClient } from '@tanstack/react-query'
import { type LinkOptions, useRouteContext } from '@tanstack/react-router'

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

  const checkoutPremium = async (billingPeriod: BillingPeriod) => {
    if (!user) {
      showDialog('auth', {})

      return
    }

    try {
      const promise = new Promise((resolve) => {
        setTimeout(resolve, 1)
      }).then(async () => {
        const activeSubscription = await queryClient.fetchQuery(
          getActiveSubscriptionQueryOpts()
        )

        if (activeSubscription) {
          toast.success('Vous avez déjà un abonnement en cours !')

          return
        }

        const planName = PREMIUM_PLAN.pricing[billingPeriod].betterAuthPlanName

        const { error } = await authClient.subscription.upgrade({
          plan: planName,
          successUrl: '/checkout/success' satisfies LinkOptions['to'],
          cancelUrl: '/pricing' satisfies LinkOptions['to'],
          returnUrl: '/settings' as LinkOptions['to']
        })

        if (error) {
          throw error
        }
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
