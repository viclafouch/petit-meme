import type { FeedbackInternalOptions } from '@sentry/core'
import type * as Sentry from '@sentry/tanstackstart-react'

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

export const FEEDBACK_OPTIONS = {
  colorScheme: 'system',
  autoInject: false,
  showBranding: false,
  showName: false,
  showEmail: true,
  isEmailRequired: false,
  enableScreenshot: true,
  triggerLabel: 'Feedback',
  triggerAriaLabel: 'Envoyer un feedback',
  formTitle: 'Un souci ? Dis-nous tout !',
  submitButtonLabel: 'Envoyer',
  cancelButtonLabel: 'Annuler',
  confirmButtonLabel: 'Confirmer',
  addScreenshotButtonLabel: 'Ajouter une capture',
  removeScreenshotButtonLabel: 'Retirer la capture',
  emailLabel: 'Ton email',
  emailPlaceholder: 'ton.email@exemple.fr',
  messageLabel: 'Décris le problème',
  messagePlaceholder: "Qu'est-ce qui ne va pas ? Qu'est-ce que tu attendais ?",
  successMessageText: 'Merci pour ton retour !',
  isRequiredLabel: '(obligatoire)',
  themeLight: {
    accentBackground: 'oklch(0.205 0 0)',
    accentForeground: '#ffffff'
  },
  themeDark: {
    accentBackground: 'oklch(0.922 0 0)',
    accentForeground: '#000000'
  }
} as const satisfies FeedbackOptions

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
