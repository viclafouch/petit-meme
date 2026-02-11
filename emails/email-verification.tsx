import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text
} from '@react-email/components'
import { baseUrl, styles } from './_utils'

type EmailVerificationProps = {
  username: string
  verificationUrl: string
}

export const EmailVerification = ({
  username,
  verificationUrl
}: EmailVerificationProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Preview>Confirme ton inscription à Petit Meme</Preview>
        <Container style={styles.container}>
          <Img
            src={`${baseUrl}/images/logo.png`}
            width="40"
            height="40"
            alt="Petit Meme"
          />
          <Section>
            <Text style={styles.text}>Salut {username},</Text>
            <Text style={styles.text}>
              Bienvenue sur <b>Petit Meme</b> ! Avant de commencer à explorer et
              créer tes mèmes, tu dois <b>confirmer ton adresse e-mail</b>.
            </Text>
            <Button style={styles.button} href={verificationUrl}>
              Confirmer mon inscription
            </Button>
            <Text style={styles.text}>
              Si tu n’as pas créé de compte sur Petit Meme, ignore simplement ce
              message.
            </Text>
            <Text style={styles.text}>
              Cette étape nous permet de vérifier que tu es bien à l’origine de
              cette inscription et de sécuriser ton compte.
            </Text>
            <Text style={styles.text}>
              À très vite pour des mèmes légendaires !
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

EmailVerification.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io'
} as EmailVerificationProps

export default EmailVerification
