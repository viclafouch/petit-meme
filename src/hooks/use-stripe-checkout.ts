import React from 'react'
import { toast } from 'sonner'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { type LinkOptions, useRouteContext } from '@tanstack/react-router'
import { type BillingPeriod, PREMIUM_PLAN_NAME } from '~/constants/plan'
import { getErrorMessage } from '~/helpers/error'
import { createLatch, type LatchEnd } from '~/helpers/promise'
import { authClient } from '~/lib/auth-client'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { dialogStore } from '~/stores/dialog.store'

const openBillingPortal = async () => {
  const { error } = await authClient.subscription.billingPortal({
    locale: getLocale(),
    returnUrl: '/settings'
  })

  if (error) {
    throw new Error(getErrorMessage(error), { cause: error })
  }
}

const startCheckout = async (
  queryClient: QueryClient,
  billingPeriod: BillingPeriod
): Promise<LatchEnd> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 1)
  })

  const activeSubscription = await queryClient.query(
    getActiveSubscriptionQueryOpts()
  )

  if (activeSubscription) {
    toast.success(m.error_already_subscribed())

    return 'release'
  }

  const { error } = await authClient.subscription.upgrade({
    plan: PREMIUM_PLAN_NAME,
    annual: billingPeriod === 'yearly',
    successUrl: '/checkout/success' satisfies LinkOptions['to'],
    cancelUrl: '/pricing' satisfies LinkOptions['to'],
    returnUrl: '/settings' satisfies LinkOptions['to']
  })

  if (error) {
    throw new Error(getErrorMessage(error), { cause: error })
  }

  return 'hold'
}

const checkoutLatch = createLatch(
  async (queryClient: QueryClient, billingPeriod: BillingPeriod) => {
    const promise = startCheckout(queryClient, billingPeriod)

    toast.promise(promise, {
      loading: m.common_loading(),
      error: getErrorMessage
    })

    return promise
  }
)

export const useStripeCheckout = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const releaseOnBackForwardRestore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkoutLatch.release()
      }
    }

    window.addEventListener('pageshow', releaseOnBackForwardRestore)

    return () => {
      window.removeEventListener('pageshow', releaseOnBackForwardRestore)
    }
  }, [])

  const goToBillingPortal = async () => {
    if (!user) {
      dialogStore.actions.showDialog('auth')

      return
    }

    try {
      const promise = openBillingPortal()

      toast.promise(promise, {
        loading: m.common_loading(),
        error: getErrorMessage
      })

      await promise
    } catch (error) {
      captureWithFeature(error, 'stripe-checkout')
    }
  }

  const checkoutPremium = async (billingPeriod: BillingPeriod) => {
    if (!user) {
      dialogStore.actions.showDialog('auth')

      return
    }

    try {
      await checkoutLatch.run(queryClient, billingPeriod)
    } catch (error) {
      captureWithFeature(error, 'stripe-checkout')
    }
  }

  return {
    goToBillingPortal,
    checkoutPremium
  }
}
