import { formatCentsToEuros } from '~/helpers/number'
import type { PaymentKind } from '~/helpers/subscription'

type FormatPaymentReceivedTitleParams = {
  kind: PaymentKind
  renewalCount: number
}

export const formatPaymentReceivedTitle = ({
  kind,
  renewalCount
}: FormatPaymentReceivedTitleParams) => {
  if (kind === 'new') {
    return 'Nouvel abonnement'
  }

  if (kind === 'renewal') {
    return `Renouvellement n°${renewalCount}`
  }

  return 'Paiement reçu'
}

export const formatPaymentAmount = (cents: number) => {
  return formatCentsToEuros(cents, {
    locale: 'fr',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
