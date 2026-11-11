import { Link, Section, Text } from 'react-email'
import { BUTTON_CLASS, SITE_URL } from './constants'
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

export const PendingProposalsReminderEmail = ({
  proposals
}: PendingProposalsReminderEmailProps) => {
  return (
    <EmailLayout
      preview={`${String(proposals.length)} proposition${proposals.length > 1 ? 's' : ''} en attente`}
      locale="fr"
    >
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Propositions en attente
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {proposals.length} proposition{proposals.length > 1 ? 's' : ''} en
          attente de modération.
        </Text>
        {proposals.map((proposal) => {
          return (
            <Section
              key={proposal.id}
              className="mb-3 rounded-lg border border-brand-border bg-neutral-50 px-4 py-3"
            >
              <Text className="m-0 text-sm font-medium text-brand">
                {proposal.title}
              </Text>
              <Text className="m-0 mt-1 text-xs text-brand-muted">
                par {proposal.userName} · {proposal.createdAt}
              </Text>
            </Section>
          )
        })}
        <Section className="mt-6 text-center">
          <Link href={ADMIN_PROPOSALS_URL} className={BUTTON_CLASS}>
            Voir les propositions
          </Link>
        </Section>
      </Section>
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
