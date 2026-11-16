import type React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text
} from 'react-email'
import { getCurrentYear } from '~/helpers/date'
import type { Locale } from '~/paraglide/runtime'
import {
  buildEmailUrl,
  CONTACT_EMAIL,
  LOGO_URL,
  TAILWIND_CONFIG
} from './constants'

const layoutTranslations = {
  fr: {
    allRightsReserved: 'Tous droits réservés.'
  },
  en: {
    allRightsReserved: 'All rights reserved.'
  }
} as const satisfies Record<Locale, Record<string, string>>

const LOGO_SIZE = 48

type EmailLayoutProps = {
  preview: string
  heading: string
  locale: Locale
  children: React.ReactNode
}

export const EmailLayout = ({
  preview,
  heading,
  locale,
  children
}: EmailLayoutProps) => {
  const tr = layoutTranslations[locale]

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
        </Head>
        <Body className="m-0 bg-white px-2 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-140 rounded-lg border border-solid border-brand-border px-6 py-8">
            <Section className="text-center">
              <Link href={buildEmailUrl('/', locale)}>
                <Img
                  src={LOGO_URL}
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  alt="Petit Meme"
                  className="mx-auto"
                />
              </Link>
            </Section>
            <Heading className="mx-0 mt-8 mb-6 p-0 text-center text-2xl leading-8 font-semibold tracking-tight text-brand">
              {heading}
            </Heading>
            {children}
            <Hr className="mt-8 mb-6 border-brand-border" />
            <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
              © {getCurrentYear()} Petit Meme. {tr.allRightsReserved}
            </Text>
            <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
              <Link
                href={buildEmailUrl('/', locale)}
                className="text-brand-muted-dark underline"
              >
                petit-meme.io
              </Link>
              {'  ·  '}
              <Link
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-brand-muted-dark underline"
              >
                {CONTACT_EMAIL}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
