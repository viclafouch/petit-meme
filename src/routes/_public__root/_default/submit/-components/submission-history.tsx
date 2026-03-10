import type { VariantProps } from 'class-variance-authority'
import { ArrowRight } from 'lucide-react'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MemeSubmissionStatus } from '@/db/generated/prisma/enums'
import { formatRelativeTime } from '@/helpers/date'
import { truncateUrl } from '@/helpers/format'
import { getUserSubmissionsQueryOpts } from '@/lib/queries'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_BADGE_VARIANT = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive'
} as const satisfies Record<MemeSubmissionStatus, BadgeVariant>

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
} as const satisfies Record<MemeSubmissionStatus, () => string>

export const SubmissionHistory = () => {
  const submissionsQuery = useSuspenseQuery(getUserSubmissionsQueryOpts())
  const locale = getLocale()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{m.submit_history_heading()}</h2>
      <div className="flex flex-col">
        {submissionsQuery.data.submissions.map((submission, index) => {
          const createdAt = new Date(submission.createdAt)

          return (
            <div key={submission.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium truncate">
                    {submission.title}
                  </p>
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground truncate"
                  >
                    {truncateUrl(submission.url)}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant={STATUS_BADGE_VARIANT[submission.status]}
                      size="sm"
                    >
                      {STATUS_LABELS[submission.status]()}
                    </Badge>
                    <time
                      dateTime={createdAt.toISOString()}
                      className="text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(createdAt, locale)}
                    </time>
                  </div>
                </div>
                {submission.status === MemeSubmissionStatus.APPROVED &&
                submission.memeId ? (
                  <Link
                    to="/memes/$memeId"
                    params={{ memeId: submission.memeId }}
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
