import { PASSWORD_MIN_LENGTH } from '~/constants/auth'
import type { authClient } from '~/lib/auth-client'
import { m } from '~/paraglide/messages.js'

type AuthErrorCode = keyof typeof authClient.$ERROR_CODES

const AUTH_ERROR_MESSAGES: Partial<Record<AuthErrorCode, () => string>> = {
  USER_NOT_FOUND: () => {
    return m.auth_error_user_not_found()
  },
  FAILED_TO_CREATE_USER: () => {
    return m.auth_error_failed_to_create_user()
  },
  FAILED_TO_CREATE_SESSION: () => {
    return m.auth_error_failed_to_create_session()
  },
  FAILED_TO_UPDATE_USER: () => {
    return m.auth_error_failed_to_update_user()
  },
  FAILED_TO_GET_SESSION: () => {
    return m.auth_error_failed_to_get_session()
  },
  INVALID_PASSWORD: () => {
    return m.auth_error_invalid_password()
  },
  INVALID_EMAIL: () => {
    return m.auth_error_invalid_email()
  },
  INVALID_EMAIL_OR_PASSWORD: () => {
    return m.auth_error_invalid_email_or_password()
  },
  SOCIAL_ACCOUNT_ALREADY_LINKED: () => {
    return m.auth_error_social_account_already_linked()
  },
  PROVIDER_NOT_FOUND: () => {
    return m.auth_error_provider_not_found()
  },
  INVALID_TOKEN: () => {
    return m.auth_error_invalid_token()
  },
  ID_TOKEN_NOT_SUPPORTED: () => {
    return m.auth_error_id_token_not_supported()
  },
  FAILED_TO_GET_USER_INFO: () => {
    return m.auth_error_failed_to_get_user_info()
  },
  USER_EMAIL_NOT_FOUND: () => {
    return m.auth_error_user_email_not_found()
  },
  EMAIL_NOT_VERIFIED: () => {
    return m.auth_error_email_not_verified()
  },
  PASSWORD_TOO_SHORT: () => {
    return m.auth_error_password_too_short({
      minLength: String(PASSWORD_MIN_LENGTH)
    })
  },
  PASSWORD_TOO_LONG: () => {
    return m.auth_error_password_too_long()
  },
  USER_ALREADY_EXISTS: () => {
    return m.auth_error_user_already_exists()
  },
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: () => {
    return m.auth_error_user_already_exists_use_another()
  },
  EMAIL_CAN_NOT_BE_UPDATED: () => {
    return m.auth_error_email_cannot_be_updated()
  },
  CREDENTIAL_ACCOUNT_NOT_FOUND: () => {
    return m.auth_error_account_not_found()
  },
  SESSION_EXPIRED: () => {
    return m.auth_error_session_expired()
  },
  FAILED_TO_UNLINK_LAST_ACCOUNT: () => {
    return m.auth_error_failed_to_unlink_last_account()
  },
  ACCOUNT_NOT_FOUND: () => {
    return m.auth_error_account_not_found()
  },
  USER_ALREADY_HAS_PASSWORD: () => {
    return m.auth_error_user_already_has_password()
  }
}

const EXTRA_ERROR_MESSAGES: Record<string, () => string> = {
  TOO_MANY_REQUESTS: () => {
    return m.auth_error_too_many_requests()
  },
  BANNED_USER: () => {
    return m.auth_error_banned_user()
  }
}

type AuthErrorResponse = {
  code?: string
  status?: number
  message?: string
}

export function extractAuthErrorCode(error: AuthErrorResponse): string {
  if (error.code) {
    return error.code
  }

  if (error.status === 429) {
    return 'TOO_MANY_REQUESTS'
  }

  return error.message ?? 'UNKNOWN'
}

export function getAuthErrorMessage(code: string): string {
  const getMessage =
    AUTH_ERROR_MESSAGES[code as AuthErrorCode] ?? EXTRA_ERROR_MESSAGES[code]

  if (getMessage) {
    return getMessage()
  }

  if (import.meta.env.DEV) {
    // oxlint-disable-next-line no-console
    console.warn(`[auth-errors] Untranslated code: ${code}`)
  }

  return m.auth_error_unknown()
}

const CHANGE_PASSWORD_ERROR_MESSAGES: Partial<
  Record<AuthErrorCode, () => string>
> = {
  PASSWORD_TOO_SHORT: () => {
    return m.auth_error_change_password_too_short({
      minLength: String(PASSWORD_MIN_LENGTH)
    })
  },
  PASSWORD_TOO_LONG: () => {
    return m.auth_error_change_password_too_long()
  }
}

export function getChangePasswordErrorMessage(code: string): string {
  const getMessage = CHANGE_PASSWORD_ERROR_MESSAGES[code as AuthErrorCode]

  if (getMessage) {
    return getMessage()
  }

  return getAuthErrorMessage(code)
}
