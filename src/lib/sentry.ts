import * as Sentry from '@sentry/tanstackstart-react'
import { wrapMiddlewaresWithSentry } from '@sentry/tanstackstart-react'
import { createIsomorphicFn } from '@tanstack/react-start'
import { IS_DEVELOPMENT } from '~/constants/env'
import { whenSentryLoads } from '~/lib/sentry-client'

type CaptureContext = Parameters<typeof Sentry.captureException>[1]

export const captureException = createIsomorphicFn()
  .server((exception: unknown, captureContext?: CaptureContext) => {
    Sentry.captureException(exception, captureContext)
  })
  .client((exception: unknown, captureContext?: CaptureContext) => {
    void whenSentryLoads((sentryClient) => {
      sentryClient.captureException(exception, captureContext)
    })
  })

export type SentryFeature =
  | 'stripe-checkout'
  | 'stripe-payment'
  | 'stripe-billing-portal'
  | 'stripe-customer-locale'
  | 'bunny-webhook'
  | 'bunny-cleanup'
  | 'resend-email'
  | 'bookmark'
  | 'share'
  | 'download'
  | 'admin-ban'
  | 'admin-dashboard'
  | 'admin-meme-edit'
  | 'admin-meme-import'
  | 'meme-draft-fill'
  | 'admin-user-ban'
  | 'admin-user-unban'
  | 'admin-user-delete'
  | 'admin-user-premium'
  | 'sign-in'
  | 'sign-in-twitter'
  | 'sign-in-discord'
  | 'sign-up'
  | 'sign-out'
  | 'reset-password'
  | 'verify-email'
  | 'request-password-reset'
  | 'delete-account'
  | 'update-password'
  | 'update-avatar'
  | 'data-export'
  | 'file-upload'
  | 'studio'
  | 'scraping-detection'
  | 'meme-submission'
  | 'admin-submission'
  | 'admin-downloader'
  | 'admin-meme-files'
  | 'admin-category'
  | 'watermark-fallback'
  | 'ai-search'
  | 'activity-event'
  | 'og-image'
  | 'verification-email-quota'
  | 'googlebot-verification'
  | 'install-app'
  | 'service-worker'

export const captureWithFeature = (error: unknown, feature: SentryFeature) => {
  if (IS_DEVELOPMENT) {
    console.error(`[${feature}]`, error)
  }

  captureException(error, { tags: { feature } })
}

type SentryMiddleware = Parameters<typeof wrapMiddlewaresWithSentry>[0][string]

export const wrapMiddlewareWithSentry = <TMiddleware extends SentryMiddleware>(
  name: string,
  middleware: TMiddleware
): TMiddleware => {
  const [wrappedMiddleware = middleware] = wrapMiddlewaresWithSentry({
    [name]: middleware
  })

  return wrappedMiddleware
}
