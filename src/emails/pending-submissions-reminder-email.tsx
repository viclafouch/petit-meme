import { Link, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, SITE_URL } from './constants'
import { EmailLayout } from './email-layout'

type PendingSubmission = {
  id: string
  title: string
  userName: string
  createdAt: string
}

type PendingSubmissionsReminderEmailProps = {
  submissions: readonly PendingSubmission[]
}

const ADMIN_SUBMISSIONS_URL = `${SITE_URL}/admin/submissions?status=PENDING`

export const PendingSubmissionsReminderEmail = ({
  submissions
}: PendingSubmissionsReminderEmailProps) => {
  return (
    <EmailLayout
      preview={`${String(submissions.length)} proposition${submissions.length > 1 ? 's' : ''} en attente`}
      locale="fr"
    >
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Propositions en attente
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {submissions.length} proposition{submissions.length > 1 ? 's' : ''} en
          attente de modération.
        </Text>
        {submissions.map((submission) => {
          return (
            <Section
              key={submission.id}
              className="mb-3 rounded-lg border border-brand-border bg-neutral-50 px-4 py-3"
            >
              <Text className="m-0 text-sm font-medium text-brand">
                {submission.title}
              </Text>
              <Text className="m-0 mt-1 text-xs text-brand-muted">
                par {submission.userName} · {submission.createdAt}
              </Text>
            </Section>
          )
        })}
        <Section className="mt-6 text-center">
          <Link href={ADMIN_SUBMISSIONS_URL} className={BUTTON_CLASS}>
            Voir les propositions
          </Link>
        </Section>
      </Section>
    </EmailLayout>
  )
}

PendingSubmissionsReminderEmail.PreviewProps = {
  submissions: [
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
} satisfies PendingSubmissionsReminderEmailProps

export default PendingSubmissionsReminderEmail
