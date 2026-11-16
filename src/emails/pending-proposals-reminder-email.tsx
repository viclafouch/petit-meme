import { Section, Text } from 'react-email'
import { SITE_URL } from './constants'
import { EmailButton, EmailParagraph, EmailSectionItem } from './email-blocks'
import { EmailLayout } from './email-layout'

type PendingProposal = {
  id: string
  title: string
  userName: string
  createdAt: string
}

type PendingProposalsReminderEmailProps = {
  proposals: readonly PendingProposal[]
}

const ADMIN_PROPOSALS_URL = `${SITE_URL}/admin/proposals?status=PENDING`

const formatPendingCount = (count: number) => {
  return count > 1
    ? `${count} propositions en attente`
    : `${count} proposition en attente`
}

export const PendingProposalsReminderEmail = ({
  proposals
}: PendingProposalsReminderEmailProps) => {
  const pendingCount = formatPendingCount(proposals.length)

  return (
    <EmailLayout preview={pendingCount} heading={pendingCount} locale="fr">
      <EmailParagraph>
        Ces mèmes attendent ta décision avant de rejoindre la bibliothèque.
      </EmailParagraph>
      <Section className="mt-6 border-0 border-t border-solid border-brand-border">
        {proposals.map((proposal) => {
          return (
            <EmailSectionItem key={proposal.id}>
              <Text className="m-0 text-sm leading-5 font-semibold text-brand">
                {proposal.title}
              </Text>
              <Text className="m-0 mt-1 text-xs leading-5 text-brand-muted-dark">
                Proposé par {proposal.userName} le {proposal.createdAt}
              </Text>
            </EmailSectionItem>
          )
        })}
      </Section>
      <EmailButton href={ADMIN_PROPOSALS_URL}>
        Voir les propositions
      </EmailButton>
    </EmailLayout>
  )
}

PendingProposalsReminderEmail.PreviewProps = {
  proposals: [
    {
      id: 'clx1',
      title: 'Le chat qui danse',
      userName: 'Alan',
      createdAt: '9 mars 2026'
    },
    {
      id: 'clx2',
      title: 'Quand tu ouvres Twitter le lundi',
      userName: 'Marie',
      createdAt: '10 mars 2026'
    }
  ]
} satisfies PendingProposalsReminderEmailProps

export default PendingProposalsReminderEmail
