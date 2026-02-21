import { Button, Section, Text } from '@react-email/components'
import { EmailLayout } from './email-layout'

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
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Nous n'avons pas pu traiter le paiement de ton abonnement{' '}
          <b>Petit Meme</b>.
        </Text>
        <Section className="mb-4 rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-sm leading-6 text-brand-danger">
            Sans mise à jour de ton moyen de paiement, tu perdras l'accès aux
            fonctionnalités premium.
          </Text>
        </Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Mets à jour ton moyen de paiement pour continuer à profiter de ton
          abonnement :
        </Text>
        <Button
          className="box-border inline-block rounded-lg bg-brand-button px-5 py-3.5 text-center text-sm font-medium text-brand-button-foreground no-underline"
          href={billingPortalUrl}
        >
          Mettre à jour mon paiement
        </Button>
        <Text className="m-0 mt-4 text-xs leading-5 text-brand-muted">
          Si tu penses qu'il s'agit d'une erreur, contacte-nous à{' '}
          <b>hello@petit-meme.io</b>.
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
