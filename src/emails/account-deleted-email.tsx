import { Section, Text } from '@react-email/components'
import { CONTACT_EMAIL, EmailLayout } from './email-layout'

type AccountDeletedEmailProps = {
  username: string
}

export const AccountDeletedEmail = ({ username }: AccountDeletedEmailProps) => {
  return (
    <EmailLayout preview="Ton compte Petit Meme a été supprimé">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Compte supprimé
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Ton compte a bien été supprimé.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, ton compte <b>Petit Meme</b> a été supprimé avec
          succès. Toutes tes données personnelles ont été effacées.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Si tu penses que cette suppression est une erreur, contacte-nous
          rapidement à <b>{CONTACT_EMAIL}</b> pour que nous puissions t'aider.
        </Text>
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          Merci d'avoir utilisé Petit Meme.
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountDeletedEmail.PreviewProps = {
  username: 'Alan'
} satisfies AccountDeletedEmailProps

export default AccountDeletedEmail
