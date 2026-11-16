import type { Stripe } from 'stripe'
import { formatDate } from '~/helpers/date'
import {
  formatPaymentAmount,
  formatPaymentReceivedTitle
} from '~/helpers/payment-received'
import { matchIsYearlyInterval, type PaymentKind } from '~/helpers/subscription'
import { SITE_URL } from './constants'
import {
  BoldText,
  type EmailDetail,
  EmailButton,
  EmailDetails,
  EmailParagraph
} from './email-blocks'
import { EmailLayout } from './email-layout'

type PaymentReceivedEmailProps = {
  kind: PaymentKind
  renewalCount: number
  amountCents: number
  interval: Stripe.Price.Recurring.Interval | null
  customer: {
    name: string
    email: string | null
    userId: string | null
  }
  history: {
    customerSince: Date | null
    paidMonthCount: number
    collectedCents: number
  }
}

const buildPlanLabel = (interval: PaymentReceivedEmailProps['interval']) => {
  if (interval === null) {
    return null
  }

  return matchIsYearlyInterval(interval) ? 'Annuelle' : 'Mensuelle'
}

export const PaymentReceivedEmail = ({
  kind,
  renewalCount,
  amountCents,
  interval,
  customer,
  history
}: PaymentReceivedEmailProps) => {
  const title = formatPaymentReceivedTitle({ kind, renewalCount })
  const amount = formatPaymentAmount(amountCents)
  const planLabel = buildPlanLabel(interval)

  const details: EmailDetail[] = [
    ...(planLabel === null ? [] : [{ label: 'Formule', value: planLabel }]),
    ...(customer.email === null
      ? []
      : [{ label: 'E-mail', value: customer.email }]),
    ...(history.customerSince === null
      ? []
      : [
          {
            label: 'Client depuis',
            value: formatDate(history.customerSince, 'fr', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })
          }
        ]),
    { label: 'Mois payés', value: String(history.paidMonthCount) },
    {
      label: 'Total encaissé',
      value: formatPaymentAmount(history.collectedCents)
    }
  ]

  return (
    <EmailLayout
      preview={`${amount} de ${customer.name}`}
      heading={title}
      locale="fr"
    >
      <EmailParagraph>
        <BoldText text={`**${customer.name}** a payé **${amount}**.`} />
      </EmailParagraph>
      <EmailDetails details={details} />
      {customer.userId === null ? null : (
        <EmailButton href={`${SITE_URL}/admin/users/${customer.userId}`}>
          Voir sa fiche
        </EmailButton>
      )}
    </EmailLayout>
  )
}

PaymentReceivedEmail.PreviewProps = {
  kind: 'renewal',
  renewalCount: 3,
  amountCents: 399,
  interval: 'month',
  customer: {
    name: 'Alan',
    email: 'alan@example.test',
    userId: 'user-id'
  },
  history: {
    customerSince: new Date('2026-08-14T10:00:00.000Z'),
    paidMonthCount: 4,
    collectedCents: 1596
  }
} satisfies PaymentReceivedEmailProps

export default PaymentReceivedEmail
