import { m } from '@/paraglide/messages.js'
import type { FeedbackInternalOptions } from '@sentry/core'
import * as Sentry from '@sentry/tanstackstart-react'
import { wrapMiddlewaresWithSentry } from '@sentry/tanstackstart-react'

type SentryFeature =
  | 'stripe-checkout'
  | 'stripe-payment'
  | 'stripe-billing-portal'
  | 'bunny-webhook'
  | 'bunny-cleanup'
  | 'ai-generation'
  | 'resend-email'
  | 'bookmark'
  | 'share'
  | 'download'
  | 'admin-ban'
  | 'admin-dashboard'
  | 'admin-meme-edit'
  | 'admin-user-delete'
  | 'sign-in'
  | 'sign-in-twitter'
  | 'sign-up'
  | 'sign-out'
  | 'reset-password'
  | 'request-password-reset'
  | 'delete-account'
  | 'update-password'
  | 'data-export'
  | 'file-upload'
  | 'studio'
  | 'scraping-detection'
  | 'meme-submission'
  | 'admin-submission'
  | 'admin-downloader'
  | 'admin-watermark'
  | 'bunny-storage-cleanup'

export const captureWithFeature = (error: unknown, feature: SentryFeature) => {
  Sentry.captureException(error, { tags: { feature } })
}

type SentryMiddleware = Parameters<typeof wrapMiddlewaresWithSentry>[0][string]

export const wrapMiddlewareWithSentry = <T extends SentryMiddleware>(
  name: string,
  middleware: T
): T => {
  return wrapMiddlewaresWithSentry({ [name]: middleware })[0]!
}

type FeedbackOptions = Partial<
  Omit<FeedbackInternalOptions, 'themeLight' | 'themeDark'>
> & {
  themeLight?: Partial<FeedbackInternalOptions['themeLight']>
  themeDark?: Partial<FeedbackInternalOptions['themeDark']>
}

const SENSITIVE_API_PATHS = [
  '/api/auth/',
  '/api/stripe/'
] as const satisfies readonly string[]

export const SENSITIVE_API_PATTERNS = SENSITIVE_API_PATHS.map((path) => {
  return new RegExp(path.replaceAll('/', '\\/'))
})

export const getFeedbackOptions = (): FeedbackOptions => {
  return {
    colorScheme: 'system',
    autoInject: false,
    showBranding: false,
    showName: false,
    showEmail: true,
    isEmailRequired: false,
    enableScreenshot: true,
    triggerLabel: m.sentry_trigger_label(),
    triggerAriaLabel: m.sentry_trigger_aria(),
    formTitle: m.sentry_form_title(),
    submitButtonLabel: m.sentry_submit(),
    cancelButtonLabel: m.common_cancel(),
    confirmButtonLabel: m.common_confirm(),
    addScreenshotButtonLabel: m.sentry_add_screenshot(),
    removeScreenshotButtonLabel: m.sentry_remove_screenshot(),
    emailLabel: m.sentry_email_label(),
    emailPlaceholder: m.sentry_email_placeholder(),
    messageLabel: m.sentry_message_label(),
    messagePlaceholder: m.sentry_message_placeholder(),
    successMessageText: m.sentry_success(),
    isRequiredLabel: m.sentry_required(),
    themeLight: {
      accentBackground: 'oklch(0.205 0 0)',
      accentForeground: '#ffffff'
    },
    themeDark: {
      accentBackground: 'oklch(0.922 0 0)',
      accentForeground: '#000000'
    }
  }
}

const PII_USER_FIELDS = new Set(['email', 'username'])

const matchIsSensitiveApiUrl = (url: string) => {
  return SENSITIVE_API_PATHS.some((path) => {
    return url.includes(path)
  })
}

export const scrubUserPii = (event: Sentry.ErrorEvent) => {
  if (!event.user || event.type === 'feedback') {
    return event
  }

  const safeUser = Object.fromEntries(
    Object.entries(event.user).filter(([key]) => {
      return !PII_USER_FIELDS.has(key)
    })
  )

  return { ...event, user: safeUser }
}

export const scrubSensitiveBreadcrumbs = (breadcrumb: Sentry.Breadcrumb) => {
  const isNetworkBreadcrumb =
    breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch'

  if (!isNetworkBreadcrumb) {
    return breadcrumb
  }

  const url = breadcrumb.data?.url ?? ''

  if (!matchIsSensitiveApiUrl(url)) {
    return breadcrumb
  }

  return {
    ...breadcrumb,
    data: {
      url: breadcrumb.data?.url,
      method: breadcrumb.data?.method
    }
  }
}
