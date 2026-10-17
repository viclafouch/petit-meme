import { LogIn } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { MAX_PENDING_SUBMISSIONS } from '~/constants/meme-submission'
import { useShowDialog } from '~/hooks/use-show-dialog'
import { getUserSubmissionsQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { SubmissionForm } from './submission-form'
import { SubmissionHistory } from './submission-history'
import { SubmissionRules } from './submission-rules'

const NotLoggedIn = () => {
  const showDialog = useShowDialog()

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-muted-foreground text-center">
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
      </CardContent>
    </Card>
  )
}

const SubmitPageContent = () => {
  const submissionsQuery = useSuspenseQuery(getUserSubmissionsQueryOpts())
  const hasSubmissions = submissionsQuery.data.submissions.length > 0

  return (
    <div
      className={
        hasSubmissions
          ? 'grid gap-6 lg:grid-cols-submit'
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
        <aside className="lg:row-span-2 lg:sticky lg:top-20 lg:self-start lg:max-h-sticky-aside lg:overflow-y-auto">
          <Card>
            <CardContent>
              <SubmissionHistory />
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  )
}

export const SubmitPage = () => {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>{m.submit_heading()}</PageHeading>
        <PageDescription>{m.submit_page_intro()}</PageDescription>
      </div>
      {user ? <SubmitPageContent /> : <NotLoggedIn />}
      <SubmissionRules />
    </div>
  )
}
