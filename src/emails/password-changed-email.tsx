import { Section, Text } from '@react-email/components'
import { EmailLayout } from './email-layout'

type PasswordChangedEmailProps = {
  username: string
  changedAt: string
}

export const PasswordChangedEmail = ({
  username,
  changedAt
}: PasswordChangedEmailProps) => {
  return (
    <EmailLayout preview="Ton mot de passe Petit Meme a été modifié">
      <Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Ton mot de passe <b>Petit Meme</b> a été modifié avec succès le{' '}
          <b>{changedAt}</b>.
        </Text>
        <Section className="rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-sm leading-6 text-brand-danger">
            Si tu n'es pas à l'origine de ce changement, contacte-nous
            immédiatement à <b>hello@petit-meme.io</b>.
          </Text>
        </Section>
        <Text className="m-0 mt-4 text-base leading-7 text-neutral-700">
          Toutes les sessions actives ont été déconnectées par mesure de
          sécurité.
        </Text>
      </Section>
    </EmailLayout>
  )
}

PasswordChangedEmail.PreviewProps = {
  username: 'Alan',
  changedAt: '21 février 2026 à 14:30'
} satisfies PasswordChangedEmailProps

export default PasswordChangedEmail
