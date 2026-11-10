import type React from 'react'
import { Column, Link, Row, Section, Text } from 'react-email'
import { MEME_FILL_MAX_ATTEMPTS } from '~/constants/meme-fill'
import {
  formatFailuresLabel,
  formatMemeFillDigestSummary,
  formatReadyDraftsLabel
} from '~/helpers/meme-fill-digest'
import type { MemeFillDigest } from '~/server/meme-fill-night.server'
import { BUTTON_CLASS, SITE_URL } from './constants'
import { EmailLayout } from './email-layout'

type MemeFillDigestEmailProps = {
  digest: MemeFillDigest
}

const READY_DRAFTS_URL = `${SITE_URL}/admin/library?ready=true`

const buildMemeEditUrl = (memeId: string) => {
  return `${SITE_URL}/admin/library/${memeId}`
}

const SECTION_TITLE_CLASS = 'm-0 pb-2 text-base font-semibold text-brand'

const ROW_CLASS = 'border-0 border-b border-solid border-brand-border'

const LINK_CLASS = 'text-brand underline'

const TABULAR_STYLE = {
  fontVariantNumeric: 'tabular-nums'
} as const satisfies React.CSSProperties

type DigestSectionProps = {
  title: string
  children: React.ReactNode
  aside?: string
}

const DigestSection = ({ title, aside, children }: DigestSectionProps) => {
  return (
    <Section className="mb-10">
      <Row className="border-0 border-b-2 border-solid border-brand">
        <Column className="align-bottom">
          <Text className={SECTION_TITLE_CLASS}>{title}</Text>
        </Column>
        {aside === undefined ? null : (
          <Column className="w-16 pb-2 text-right align-bottom text-xs text-brand-muted-dark">
            {aside}
          </Column>
        )}
      </Row>
      {children}
    </Section>
  )
}

export const MemeFillDigestEmail = ({ digest }: MemeFillDigestEmailProps) => {
  const { readyDrafts, failures } = digest

  return (
    <EmailLayout preview={formatMemeFillDigestSummary(digest)} locale="fr">
      {readyDrafts.length > 0 ? (
        <DigestSection title={formatReadyDraftsLabel(readyDrafts.length)}>
          {readyDrafts.map((draft) => {
            return (
              <Row key={draft.id} className={ROW_CLASS}>
                <Column className="py-2.5 align-top">
                  <Link
                    href={buildMemeEditUrl(draft.id)}
                    className={`text-sm ${LINK_CLASS}`}
                  >
                    {draft.title}
                  </Link>
                  {draft.doubt === '' ? null : (
                    <Text className="m-0 mt-1 text-xs text-brand-muted-dark">
                      Doute : {draft.doubt}
                    </Text>
                  )}
                </Column>
              </Row>
            )
          })}
          <Section className="mt-6 text-center">
            <Link href={READY_DRAFTS_URL} className={BUTTON_CLASS}>
              Relire les brouillons
            </Link>
          </Section>
        </DigestSection>
      ) : null}
      {failures.length > 0 ? (
        <DigestSection
          title={formatFailuresLabel(failures.length)}
          aside="Essais"
        >
          {failures.map((failure) => {
            return (
              <Row key={failure.memeId} className={ROW_CLASS}>
                <Column className="py-2.5 align-top">
                  <Text className="m-0 text-sm text-brand">
                    {failure.reason}
                  </Text>
                  <Link
                    href={buildMemeEditUrl(failure.memeId)}
                    className={`text-xs ${LINK_CLASS}`}
                  >
                    Ouvrir le mème
                  </Link>
                </Column>
                <Column
                  className="w-16 py-2.5 text-right align-top text-sm text-brand"
                  style={TABULAR_STYLE}
                >
                  {failure.attempts}/{MEME_FILL_MAX_ATTEMPTS}
                </Column>
              </Row>
            )
          })}
        </DigestSection>
      ) : null}
    </EmailLayout>
  )
}

MemeFillDigestEmail.PreviewProps = {
  digest: {
    readyDrafts: [
      {
        id: 'clx1',
        title: 'Tobey Maguire qui rigole - Spider-Man 3',
        doubt: ''
      },
      {
        id: 'clx2',
        title: 'Le chat qui tombe du canapé',
        doubt: 'Source introuvable'
      }
    ],
    failures: [
      {
        memeId: 'clx3',
        attempts: 2,
        reason: 'Bunny has no original for the finished video of clx3'
      }
    ]
  }
} satisfies MemeFillDigestEmailProps

export default MemeFillDigestEmail
