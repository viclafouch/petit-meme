import { Button, Link, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailLayout } from './email-layout'

type VerificationReminderEmailProps = {
  username: string
  verificationUrl: string
}

export const VerificationReminderEmail = ({
  username,
  verificationUrl
}: VerificationReminderEmailProps) => {
  return (
    <EmailLayout preview="Rappel : confirme ton email Petit Meme">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Rappel : confirme ton adresse e-mail
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Tu n'as pas encore confirmé ton adresse e-mail.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, tu t'es inscrit sur <b>Petit Meme</b> mais tu n'as
          pas encore confirmé ton adresse e-mail. Clique sur le bouton
          ci-dessous pour confirmer et accéder à toutes les fonctionnalités.
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-danger">
          Si tu ne confirmes pas dans les 30 jours suivant ton inscription, ton
          compte sera automatiquement supprimé.
        </Text>
        <Section className="mb-6 mt-2">
          <Button className={BUTTON_CLASS} href={verificationUrl}>
            Confirmer mon adresse e-mail
          </Button>
        </Section>
        <Text className="m-0 text-xs leading-5 text-brand-muted">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :
        </Text>
        <Text className="m-0 text-xs leading-5">
          <Link href={verificationUrl} className="text-brand-muted underline">
            {verificationUrl}
          </Link>
        </Text>
        <Text className="m-0 mt-6 text-xs leading-5 text-brand-muted">
          Si tu n'as pas créé de compte sur Petit Meme, ignore ce message.
        </Text>
      </Section>
    </EmailLayout>
  )
}

VerificationReminderEmail.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123'
} satisfies VerificationReminderEmailProps

export default VerificationReminderEmail
