import { Button, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailLayout, SITE_URL } from './email-layout'

type WelcomeEmailProps = {
  username: string
}

export const WelcomeEmail = ({ username }: WelcomeEmailProps) => {
  return (
    <EmailLayout preview="Bienvenue sur Petit Meme !">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Bienvenue, {username} !
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Ton compte est vérifié et prêt à l'emploi.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Tu peux maintenant explorer des milliers de mèmes vidéo, sauvegarder
          tes favoris et partager les meilleurs avec tes amis.
        </Text>
        <Section className="mt-2">
          <Button className={BUTTON_CLASS} href={SITE_URL}>
            Découvrir les mèmes
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  username: 'Alan'
} satisfies WelcomeEmailProps

export default WelcomeEmail
