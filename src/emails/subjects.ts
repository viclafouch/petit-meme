import type { Locale } from '@/paraglide/runtime'

export const emailSubjects = {
  fr: {
    paymentFailed: 'Échec de paiement pour ton abonnement Petit Meme',
    resetPassword: 'Réinitialise ton mot de passe Petit Meme',
    passwordChanged: 'Ton mot de passe Petit Meme a été modifié',
    verifyEmail: 'Confirme ton inscription à Petit Meme',
    welcome: 'Bienvenue sur Petit Meme !',
    subscriptionConfirmed: 'Ton abonnement Premium Petit Meme est activé !',
    verificationReminder: 'Rappel : confirme ton email Petit Meme',
    accountDeleted: 'Ton compte Petit Meme a été supprimé',
    accountBanned: 'Ton compte Petit Meme a été suspendu',
    accountUnbanned: 'Ton compte Petit Meme a été réactivé',
    submissionApproved: 'Ta proposition de mème a été acceptée !',
    submissionRejected: 'Ta proposition de mème n’a pas été retenue'
  },
  en: {
    paymentFailed: 'Payment failed for your Petit Meme subscription',
    resetPassword: 'Reset your Petit Meme password',
    passwordChanged: 'Your Petit Meme password has been changed',
    verifyEmail: 'Confirm your Petit Meme registration',
    welcome: 'Welcome to Petit Meme!',
    subscriptionConfirmed: 'Your Petit Meme Premium subscription is active!',
    verificationReminder: 'Reminder: confirm your Petit Meme email',
    accountDeleted: 'Your Petit Meme account has been deleted',
    accountBanned: 'Your Petit Meme account has been suspended',
    accountUnbanned: 'Your Petit Meme account has been reactivated',
    submissionApproved: 'Your meme submission has been approved!',
    submissionRejected: 'Your meme submission was not accepted'
  }
} as const satisfies Record<Locale, Record<string, string>>
