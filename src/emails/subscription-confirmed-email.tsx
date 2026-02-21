import { Button, Link, Section, Text } from '@react-email/components'
import { EmailLayout, SITE_URL } from './email-layout'

type SubscriptionConfirmedEmailProps = {
  username: string
  planTitle: string
  amount: string
}

export const SubscriptionConfirmedEmail = ({
  username,
  planTitle,
  amount
}: SubscriptionConfirmedEmailProps) => {
  return (
    <EmailLayout preview="Ton abonnement Premium est activé !">
      <Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Félicitations ! Ton abonnement <b>{planTitle}</b> est maintenant actif
          sur <b>Petit Meme</b>.
        </Text>
        <Section className="mb-4 rounded-lg border border-solid border-brand-border bg-neutral-50 p-4">
          <Text className="m-0 text-sm leading-6 text-neutral-700">
            Plan : <b>{planTitle}</b>
          </Text>
          <Text className="m-0 text-sm leading-6 text-neutral-700">
            Montant : <b>{amount}</b>
          </Text>
        </Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Tu as désormais accès à toutes les fonctionnalités premium. Profite
          bien !
        </Text>
        <Button
          className="box-border inline-block rounded-lg bg-brand-button px-5 py-3.5 text-center text-sm font-medium text-brand-button-foreground no-underline"
          href={SITE_URL}
        >
          Explorer Petit Meme
        </Button>
        <Text className="m-0 mt-3 text-xs leading-5 text-brand-muted">
          Ou visite directement{' '}
          <Link href={SITE_URL} className="text-brand-muted underline">
            petit-meme.io
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  )
}

SubscriptionConfirmedEmail.PreviewProps = {
  username: 'Alan',
  planTitle: 'Premium',
  amount: '3,99 €/mois'
} satisfies SubscriptionConfirmedEmailProps

export default SubscriptionConfirmedEmail
