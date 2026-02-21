import React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text
} from '@react-email/components'

type EmailLayoutProps = {
  preview: string
  children: React.ReactNode
}

export const SITE_URL = 'https://petit-meme.io'
export const LOGO_URL = `${SITE_URL}/images/logo.png`
export const CONTACT_EMAIL = 'hello@petit-meme.io'

export const BUTTON_CLASS =
  'box-border inline-block rounded-xl bg-brand-button px-8 py-4 text-center text-sm font-semibold text-brand-button-foreground no-underline'

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: '#0a0a0a',
        'brand-foreground': '#fafafa',
        'brand-muted': '#a3a3a3',
        'brand-muted-dark': '#737373',
        'brand-border': '#e5e5e5',
        'brand-button': '#0a0a0a',
        'brand-button-foreground': '#fafafa',
        'brand-danger': '#b91c1c',
        'brand-danger-bg': '#fef2f2',
        'brand-danger-border': '#fecaca',
        'brand-success': '#15803d',
        'brand-success-bg': '#f0fdf4',
        'brand-success-border': '#bbf7d0'
      }
    }
  }
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html lang="fr">
      <Tailwind config={tailwindConfig}>
        <Head>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
        </Head>
        <Body className="mx-auto my-0 bg-neutral-100 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-140">
            <Section className="mb-8 text-center">
              <Link href={SITE_URL} className="no-underline">
                <Img
                  src={LOGO_URL}
                  width="56"
                  height="56"
                  alt="Petit Meme"
                  className="mx-auto"
                />
              </Link>
              <Text className="m-0 mt-2 text-sm font-semibold tracking-wide text-brand-muted-dark">
                Petit Meme
              </Text>
            </Section>
            <Section className="rounded-2xl border border-solid border-brand-border bg-white px-10 py-10">
              {children}
            </Section>
            <Section className="mt-8 text-center">
              <Text className="m-0 text-xs leading-6 text-brand-muted">
                <Link
                  href={SITE_URL}
                  className="text-brand-muted-dark underline"
                >
                  petit-meme.io
                </Link>
                <span className="mx-2 text-brand-border">·</span>
                <Link
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand-muted-dark underline"
                >
                  {CONTACT_EMAIL}
                </Link>
              </Text>
              <Hr className="mx-auto my-4 w-10 border-brand-border" />
              <Text className="m-0 text-xs leading-5 text-brand-muted">
                © {new Date().getFullYear()} Petit Meme. Tous droits réservés.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
