import { ArrowRight } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { PROPOSAL_STATUS_BADGE_VARIANT } from '~/constants/meme-proposal'
import { MemeProposalStatus } from '~/db/generated/prisma/enums'
import { formatRelativeTime } from '~/helpers/date'
import { truncateUrl } from '~/helpers/format'
import { listUserProposalsQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const STATUS_LABELS = {
  PENDING: () => {
    return m.submit_status_pending()
  },
  APPROVED: () => {
    return m.submit_status_approved()
  },
  REJECTED: () => {
    return m.submit_status_rejected()
  }
} as const satisfies Record<MemeProposalStatus, () => string>

export const ProposalHistory = () => {
  const proposalsQuery = useSuspenseQuery(listUserProposalsQueryOpts())
  const locale = getLocale()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{m.submit_history_heading()}</h2>
      <div className="flex flex-col">
        {proposalsQuery.data.proposals.map((proposal, index) => {
          const createdAt = new Date(proposal.createdAt)

          return (
            <div key={proposal.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium truncate">
                    {proposal.title}
                  </p>
                  <a
                    href={proposal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground truncate"
                  >
                    {truncateUrl(proposal.url)}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant={PROPOSAL_STATUS_BADGE_VARIANT[proposal.status]}
                      size="sm"
                      render={<output />}
                    >
                      {STATUS_LABELS[proposal.status]()}
                    </Badge>
                    <time
                      dateTime={createdAt.toISOString()}
                      className="text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(
                        createdAt,
                        locale,
                        proposalsQuery.dataUpdatedAt
                      )}
                    </time>
                  </div>
                </div>
                {proposal.status === MemeProposalStatus.APPROVED &&
                proposal.memeId ? (
                  <Link
                    to="/memes/$memeId"
                    params={{ memeId: proposal.memeId }}
                    className="text-sm text-info hover:text-foreground shrink-0 flex items-center gap-1"
                  >
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                    {m.submit_history_view_meme()}
                  </Link>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
