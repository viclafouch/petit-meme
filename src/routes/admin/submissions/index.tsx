import type { LucideIcon } from 'lucide-react'
import { ExternalLink, Inbox, Twitter, Youtube } from 'lucide-react'
import { z } from 'zod'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '@/components/icon/flags'
import { PageHeader } from '@/components/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import type { MemeSubmissionUrlType } from '@/db/generated/prisma/enums'
import { MemeSubmissionStatus } from '@/db/generated/prisma/enums'
import { getUserInitials } from '@/helpers/format'
import { AdminTable, getRowId, PAGE_SIZE } from '@admin/-components/admin-table'
import { RelativeDateTooltip } from '@admin/-components/relative-date-tooltip'
import { getAdminSubmissionsQueryOpts } from '@admin/-lib/queries'
import type { AdminSubmission } from '@admin/-server/submissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { SubmissionActionsCell } from './-components/submission-actions-cell'

const STATUS_BADGE_MAP = {
  [MemeSubmissionStatus.PENDING]: { variant: 'warning', label: 'En attente' },
  [MemeSubmissionStatus.APPROVED]: { variant: 'success', label: 'Approuvée' },
  [MemeSubmissionStatus.REJECTED]: {
    variant: 'destructive',
    label: 'Rejetée'
  }
} as const satisfies Record<
  MemeSubmissionStatus,
  { variant: 'warning' | 'success' | 'destructive'; label: string }
>

const URL_TYPE_CONFIG = {
  TWEET: { icon: Twitter, label: 'Tweet' },
  YOUTUBE: { icon: Youtube, label: 'YouTube' }
} as const satisfies Record<
  MemeSubmissionUrlType,
  { icon: LucideIcon; label: string }
>

const SEARCH_SCHEMA = z.object({
  // eslint-disable-next-line unicorn/no-useless-undefined -- Zod .catch() requires an argument
  submissionStatus: z.enum(MemeSubmissionStatus).optional().catch(undefined)
})

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: MemeSubmissionStatus.PENDING, label: 'En attente' },
  { value: MemeSubmissionStatus.APPROVED, label: 'Approuvées' },
  { value: MemeSubmissionStatus.REJECTED, label: 'Rejetées' }
] as const

const columnHelper = createColumnHelper<AdminSubmission>()

const columns = [
  columnHelper.accessor('user', {
    header: 'Utilisateur',
    enableSorting: false,
    cell: (info) => {
      const user = info.getValue()

      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-xs">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium truncate max-w-24">{user.name}</span>
        </div>
      )
    }
  }),
  columnHelper.accessor('title', {
    header: 'Titre',
    cell: (info) => {
      return (
        <span className="font-medium truncate max-w-48 block">
          {info.getValue()}
        </span>
      )
    }
  }),
  columnHelper.accessor('url', {
    header: 'Lien',
    enableSorting: false,
    cell: (info) => {
      const url = info.getValue()
      const { urlType } = info.row.original
      const config = URL_TYPE_CONFIG[urlType]
      const Icon = config.icon

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate max-w-32">{config.label}</span>
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </a>
      )
    }
  }),
  columnHelper.accessor('contentLocale', {
    header: 'Langue',
    enableSorting: false,
    cell: (info) => {
      const locale = info.getValue()
      const FlagComponent = CONTENT_LOCALE_FLAGS[locale]

      return FlagComponent ? (
        <FlagComponent className={FLAG_ICON_CLASS} aria-label={locale} />
      ) : (
        <span className="text-muted-foreground text-sm">{locale}</span>
      )
    }
  }),
  columnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => {
      const status = info.getValue()
      const config = STATUS_BADGE_MAP[status]

      return (
        <Badge variant={config.variant} size="sm">
          {config.label}
        </Badge>
      )
    }
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => {
      return <RelativeDateTooltip date={new Date(info.getValue())} />
    }
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => {
      return <SubmissionActionsCell submission={info.row.original} />
    }
  })
]

type StatusFilterTabsParams = {
  currentStatus: string
  statusCounts: Record<MemeSubmissionStatus | 'all', number>
}

const StatusFilterTabs = ({
  currentStatus,
  statusCounts
}: StatusFilterTabsParams) => {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {STATUS_FILTER_OPTIONS.map((option) => {
        const isActive = option.value === (currentStatus || 'all')
        const count = statusCounts[option.value]
        const search =
          option.value === 'all'
            ? { submissionStatus: undefined }
            : { submissionStatus: option.value }

        return (
          <Link
            key={option.value}
            from={Route.fullPath}
            search={search}
            className="relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm text-muted-foreground hover:text-foreground"
            aria-selected={isActive}
          >
            {option.label}
            <span className="ml-1.5 text-xs tabular-nums opacity-60">
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

const EmptyState = ({ hasFilter }: { hasFilter: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="size-12 mb-4 opacity-50" aria-hidden />
      <p className="text-lg font-medium">Aucune soumission</p>
      <p className="text-sm">
        {hasFilter
          ? 'Aucune soumission ne correspond à ce filtre.'
          : "Les utilisateurs n'ont pas encore soumis de mèmes."}
      </p>
    </div>
  )
}

const RouteComponent = () => {
  const { submissionStatus } = Route.useSearch()
  const submissionsQuery = useSuspenseQuery(
    getAdminSubmissionsQueryOpts(submissionStatus)
  )

  const { statusCounts } = submissionsQuery.data
  const allCount =
    statusCounts[MemeSubmissionStatus.PENDING] +
    statusCounts[MemeSubmissionStatus.APPROVED] +
    statusCounts[MemeSubmissionStatus.REJECTED]

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not compatible with React Compiler (https://github.com/TanStack/table/issues/5903)
  const table = useReactTable({
    data: submissionsQuery.data.submissions,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: {
        pageSize: PAGE_SIZE
      }
    }
  })

  return (
    <Container>
      <PageHeader title="Soumissions" />
      <div className="py-6 space-y-6">
        <StatusFilterTabs
          currentStatus={submissionStatus ?? 'all'}
          statusCounts={{ ...statusCounts, all: allCount }}
        />
        {submissionsQuery.data.submissions.length > 0 ? (
          <AdminTable table={table} caption="Liste des soumissions" />
        ) : (
          <EmptyState hasFilter={submissionStatus !== undefined} />
        )}
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/submissions/')({
  component: RouteComponent,
  validateSearch: (search) => {
    return SEARCH_SCHEMA.parse(search)
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Soumissions' }] }
  },
  loaderDeps: ({ search }) => {
    return { submissionStatus: search.submissionStatus }
  },
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(
      getAdminSubmissionsQueryOpts(deps.submissionStatus)
    )

    return {
      crumb: 'Soumissions'
    }
  }
})
