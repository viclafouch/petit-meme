import { Section, Text } from '@react-email/components'
import { CONTACT_EMAIL, EmailLayout } from './email-layout'

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
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Mot de passe modifié
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Modification effectuée le {changedAt}.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, ton mot de passe <b>Petit Meme</b> a été modifié
          avec succès. Toutes les sessions actives ont été déconnectées par
          mesure de sécurité.
        </Text>
        <Section className="rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-xs leading-5 text-brand-danger">
            Si tu n'es pas à l'origine de ce changement, contacte-nous
            immédiatement à <b>{CONTACT_EMAIL}</b>.
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}

PasswordChangedEmail.PreviewProps = {
  username: 'Alan',
  changedAt: '21 février 2026 à 14:30'
} satisfies PasswordChangedEmailProps

export default PasswordChangedEmail
