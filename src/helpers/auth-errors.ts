import type { authClient } from '@/lib/auth-client'

type AuthErrorCode = keyof typeof authClient.$ERROR_CODES

const AUTH_ERRORS_FR = {
  USER_NOT_FOUND: 'Utilisateur introuvable',
  FAILED_TO_CREATE_USER: 'Impossible de créer le compte',
  FAILED_TO_CREATE_SESSION: 'Impossible de créer la session',
  FAILED_TO_UPDATE_USER: 'Impossible de mettre à jour le compte',
  FAILED_TO_GET_SESSION: 'Impossible de récupérer la session',
  INVALID_PASSWORD: 'Le mot de passe est incorrect',
  INVALID_EMAIL: 'Email invalide',
  INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe invalide',
  SOCIAL_ACCOUNT_ALREADY_LINKED: 'Ce compte social est déjà lié',
  PROVIDER_NOT_FOUND: 'Fournisseur introuvable',
  INVALID_TOKEN: 'Lien expiré ou invalide',
  ID_TOKEN_NOT_SUPPORTED: 'Token non supporté',
  FAILED_TO_GET_USER_INFO: 'Impossible de récupérer les informations',
  USER_EMAIL_NOT_FOUND: 'Email introuvable',
  EMAIL_NOT_VERIFIED: 'Veuillez vérifier votre email avant de vous connecter',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court (12 caractères minimum)',
  PASSWORD_TOO_LONG: 'Mot de passe trop long',
  USER_ALREADY_EXISTS: 'Cette adresse email est déjà utilisée',
  EMAIL_CAN_NOT_BE_UPDATED: "L'email ne peut pas être modifié",
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Compte introuvable',
  SESSION_EXPIRED: 'Session expirée, veuillez vous reconnecter',
  FAILED_TO_UNLINK_LAST_ACCOUNT: 'Impossible de dissocier votre dernier compte',
  ACCOUNT_NOT_FOUND: 'Compte introuvable',
  USER_ALREADY_HAS_PASSWORD: 'Vous avez déjà un mot de passe'
} as const satisfies Record<AuthErrorCode, string>

export function getAuthErrorMessage(code: string) {
  const message = AUTH_ERRORS_FR[code as keyof typeof AUTH_ERRORS_FR]

  if (message) {
    return message
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[auth-errors] Code non traduit: ${code}`)
  }

  return 'Une erreur inattendue est survenue'
}

const CHANGE_PASSWORD_ERRORS_FR = {
  PASSWORD_TOO_SHORT:
    'Le nouveau mot de passe est trop court (12 caractères minimum)',
  PASSWORD_TOO_LONG: 'Le nouveau mot de passe est trop long'
} as const satisfies Partial<Record<AuthErrorCode, string>>

export function getChangePasswordErrorMessage(code: string) {
  const contextMessage =
    CHANGE_PASSWORD_ERRORS_FR[code as keyof typeof CHANGE_PASSWORD_ERRORS_FR]

  if (contextMessage) {
    return contextMessage
  }

  return getAuthErrorMessage(code)
}
