import { Button, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, CONTACT_EMAIL, EmailLayout } from './email-layout'

type PaymentFailedEmailProps = {
  username: string
  billingPortalUrl: string
}

export const PaymentFailedEmail = ({
  username,
  billingPortalUrl
}: PaymentFailedEmailProps) => {
  return (
    <EmailLayout preview="Échec de paiement pour ton abonnement Petit Meme">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Échec de paiement
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Ton dernier paiement n'a pas pu être traité.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, nous n'avons pas pu traiter le paiement de ton
          abonnement <b>Petit Meme</b>.
        </Text>
        <Section className="mb-6 rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-xs leading-5 text-brand-danger">
            Sans mise à jour de ton moyen de paiement, tu perdras l'accès aux
            fonctionnalités premium.
          </Text>
        </Section>
        <Section className="mt-2 mb-6">
          <Button className={BUTTON_CLASS} href={billingPortalUrl}>
            Mettre à jour mon paiement
          </Button>
        </Section>
        <Text className="m-0 text-xs leading-5 text-brand-muted">
          Si tu penses qu'il s'agit d'une erreur, contacte-nous à{' '}
          <b>{CONTACT_EMAIL}</b>.
        </Text>
      </Section>
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  username: 'Alan',
  billingPortalUrl: 'https://billing.stripe.com/p/login/test_example'
} satisfies PaymentFailedEmailProps

export default PaymentFailedEmail
