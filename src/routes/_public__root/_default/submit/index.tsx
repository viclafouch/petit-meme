import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MAX_PENDING_SUBMISSIONS } from '@/constants/meme-submission'
import { getUserSubmissionsQueryOpts } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { m } from '@/paraglide/messages'
import { PageHeading } from '@/routes/_public__root/-components/page-headers'
import { useShowDialog } from '@/stores/dialog.store'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { SubmissionForm } from './-components/submission-form'
import { SubmissionHistory } from './-components/submission-history'
import { SubmissionRules } from './-components/submission-rules'

const NotLoggedIn = () => {
  const showDialog = useShowDialog()

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="text-muted-foreground text-center">
        {m.submit_login_description()}
      </p>
      <Button
        onClick={(event) => {
          event.preventDefault()
          showDialog('auth', {})
        }}
      >
        <LogIn aria-hidden="true" />
        {m.submit_login_cta()}
      </Button>
    </div>
  )
}

const SubmitPageContent = () => {
  const submissionsQuery = useSuspenseQuery(getUserSubmissionsQueryOpts())
  const hasSubmissions = submissionsQuery.data.submissions.length > 0

  return (
    <div
      className={
        hasSubmissions
          ? 'grid gap-6 lg:grid-cols-[7fr_3fr]'
          : 'flex flex-col gap-6'
      }
    >
      <Card>
        <CardContent>
          {submissionsQuery.data.pendingCount < MAX_PENDING_SUBMISSIONS ? (
            <SubmissionForm pendingCount={submissionsQuery.data.pendingCount} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {m.submit_error_limit_reached()}
            </p>
          )}
        </CardContent>
      </Card>
      {hasSubmissions ? (
        <aside className="lg:row-span-2 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <Card>
            <CardContent>
              <SubmissionHistory />
            </CardContent>
          </Card>
        </aside>
      ) : null}
      <SubmissionRules />
    </div>
  )
}

const RouteComponent = () => {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6">
      <PageHeading className="text-3xl sm:text-4xl lg:text-4xl">
        {m.submit_heading()}
      </PageHeading>
      {user ? <SubmitPageContent /> : <NotLoggedIn />}
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/submit/')({
  component: RouteComponent,
  head: () => {
    return seo({
      title: m.submit_heading(),
      pathname: '/submit',
      description: m.submit_description(),
      noindex: true
    })
  },
  loader: ({ context }) => {
    if (context.user) {
      void context.queryClient.ensureQueryData(getUserSubmissionsQueryOpts())
    }
  }
})
