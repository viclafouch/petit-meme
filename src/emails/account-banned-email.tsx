import { Section, Text } from '@react-email/components'
import { CONTACT_EMAIL, EmailLayout } from './email-layout'

type AccountBannedEmailProps = {
  username: string
  banReason: string
  hasActiveSubscription: boolean
}

export const AccountBannedEmail = ({
  username,
  banReason,
  hasActiveSubscription
}: AccountBannedEmailProps) => {
  return (
    <EmailLayout preview="Ton compte Petit Meme a été suspendu">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand-danger">
          Compte suspendu
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Ton compte a été suspendu par un administrateur.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, ton compte <b>Petit Meme</b> a été suspendu pour la
          raison suivante : <b>{banReason}</b>.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Tu ne pourras plus te connecter à ton compte tant que la suspension
          sera active.
        </Text>
        {hasActiveSubscription ? (
          <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
            Ton abonnement Premium sera annulé à la fin de ta période de
            facturation en cours. Tu ne seras plus débité par la suite.
          </Text>
        ) : null}
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          Si tu penses qu'il s'agit d'une erreur, contacte-nous à{' '}
          <b>{CONTACT_EMAIL}</b>.
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountBannedEmail.PreviewProps = {
  username: 'Alan',
  banReason: 'Spam',
  hasActiveSubscription: true
} satisfies AccountBannedEmailProps

export default AccountBannedEmail
