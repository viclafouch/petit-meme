import { Button, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailLayout, SITE_URL } from './email-layout'

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
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Abonnement activé
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Bienvenue dans le mode premium, {username} !
        </Text>
        <Section className="mb-6 rounded-lg border border-solid border-brand-success-border bg-brand-success-bg p-4">
          <Text className="m-0 text-sm leading-6 text-brand-success">
            Plan : <b>{planTitle}</b>
          </Text>
          <Text className="m-0 mt-1 text-sm leading-6 text-brand-success">
            Montant : <b>{amount}</b>
          </Text>
        </Section>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Tu as désormais accès à toutes les fonctionnalités premium. Profite
          bien de Petit Meme !
        </Text>
        <Section className="mt-2">
          <Button className={BUTTON_CLASS} href={SITE_URL}>
            Explorer Petit Meme
          </Button>
        </Section>
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
