import { Section, Text } from '@react-email/components'
import { EmailLayout } from './email-layout'

type AccountDeletedEmailProps = {
  username: string
}

export const AccountDeletedEmail = ({ username }: AccountDeletedEmailProps) => {
  return (
    <EmailLayout preview="Ton compte Petit Meme a été supprimé">
      <Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Ton compte <b>Petit Meme</b> a été supprimé avec succès. Toutes tes
          données personnelles ont été effacées.
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Si tu penses que cette suppression est une erreur, contacte-nous
          rapidement à <b>hello@petit-meme.io</b> pour que nous puissions
          t'aider.
        </Text>
        <Text className="m-0 text-base leading-7 text-neutral-700">
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
