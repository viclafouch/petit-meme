import { LogIn } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext, useSearch } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { MAX_PENDING_PROPOSALS } from '~/constants/meme-proposal'
import { getSharedLink } from '~/helpers/share-target'
import { m } from '~/paraglide/messages'
import { listUserProposalsQueryOpts } from '~/queries/proposal'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { useDialogStore } from '~/stores/dialog.store'
import { ProposalForm } from './proposal-form'
import { ProposalHistory } from './proposal-history'
import { ProposalRules } from './proposal-rules'

const NotLoggedIn = () => {
  const dialogStore = useDialogStore()
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-muted-foreground text-center">
          {m.submit_login_description()}
        </p>
        <Button
          onClick={(event) => {
            event.preventDefault()
            dialogStore.actions.showDialog('auth')
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
  const proposalsQuery = useSuspenseQuery(listUserProposalsQueryOpts())
  const sharedLink = useSearch({
    from: '/_public__root/_default/submit/',
    select: getSharedLink
  })
  const hasProposals = proposalsQuery.data.proposals.length > 0

  return (
    <div
      className={
        hasProposals ? 'grid gap-6 lg:grid-cols-submit' : 'flex flex-col gap-6'
      }
    >
      <Card>
        <CardContent>
          {proposalsQuery.data.pendingCount < MAX_PENDING_PROPOSALS ? (
            <ProposalForm
              pendingCount={proposalsQuery.data.pendingCount}
              sharedLink={sharedLink}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {m.submit_error_limit_reached()}
            </p>
          )}
        </CardContent>
      </Card>
      {hasProposals ? (
        <aside className="lg:row-span-2 lg:sticky lg:top-20 lg:self-start lg:max-h-sticky-aside lg:overflow-y-auto">
          <Card>
            <CardContent>
              <ProposalHistory />
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
      <ProposalRules />
    </div>
  )
}
