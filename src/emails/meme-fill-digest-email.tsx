import { Column, Link, Row, Text } from 'react-email'
import { MEME_FILL_MAX_ATTEMPTS } from '~/constants/meme-fill'
import {
  formatFailuresLabel,
  formatMemeFillDigestSummary,
  formatReadyDraftsLabel
} from '~/helpers/meme-fill-digest'
import type { MemeFillDigest } from '~/server/admin/ai-assist/meme-fill-night.server'
import { SITE_URL, TABULAR_STYLE } from './constants'
import { EmailButton, EmailSection, EmailSectionItem } from './email-blocks'
import { EmailLayout } from './email-layout'

type MemeFillDigestEmailProps = {
  digest: MemeFillDigest
}

const READY_DRAFTS_URL = `${SITE_URL}/admin/library?ready=true`

const buildMemeEditUrl = (memeId: string) => {
  return `${SITE_URL}/admin/library/${memeId}`
}

export const MemeFillDigestEmail = ({ digest }: MemeFillDigestEmailProps) => {
  const { readyDrafts, failures } = digest

  return (
    <EmailLayout
      preview={formatMemeFillDigestSummary(digest)}
      heading="Remplissage de la nuit"
      locale="fr"
    >
      {readyDrafts.length > 0 ? (
        <EmailSection
          title={formatReadyDraftsLabel(readyDrafts.length)}
          caption="AI Assist a rempli ces fiches, elles attendent ta relecture."
        >
          {readyDrafts.map((draft) => {
            return (
              <EmailSectionItem key={draft.id}>
                <Link
                  href={buildMemeEditUrl(draft.id)}
                  className="text-sm leading-5 font-semibold text-brand underline"
                >
                  {draft.title}
                </Link>
                {draft.doubt === '' ? null : (
                  <Text className="m-0 mt-1 text-xs leading-5 text-brand-muted-dark">
                    Doute : {draft.doubt}
                  </Text>
                )}
              </EmailSectionItem>
            )
          })}
          <EmailButton href={READY_DRAFTS_URL}>
            Relire les brouillons
          </EmailButton>
        </EmailSection>
      ) : null}
      {failures.length > 0 ? (
        <EmailSection
          title={formatFailuresLabel(failures.length)}
          caption={`Un mème a droit à ${MEME_FILL_MAX_ATTEMPTS} essais.`}
        >
          {failures.map((failure) => {
            return (
              <EmailSectionItem key={failure.memeId}>
                <Row>
                  <Column className="align-top">
                    <Link
                      href={buildMemeEditUrl(failure.memeId)}
                      className="text-sm leading-5 font-semibold text-brand underline"
                    >
                      Ouvrir le mème
                    </Link>
                  </Column>
                  <Column
                    className="text-right align-top text-xs leading-5 text-brand-muted-dark"
                    style={TABULAR_STYLE}
                  >
                    Essai {failure.attempts} sur {MEME_FILL_MAX_ATTEMPTS}
                  </Column>
                </Row>
                <Text className="m-0 mt-1 text-xs leading-5 break-all text-brand-muted-dark">
                  {failure.reason}
                </Text>
              </EmailSectionItem>
            )
          })}
        </EmailSection>
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
