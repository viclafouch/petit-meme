import React from 'react'
import { ExternalLink, Inbox } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '~/components/icon/flags'
import { XTwitterIcon } from '~/components/icon/x-twitter'
import { YoutubeIcon } from '~/components/icon/youtube'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import { UserAvatar } from '~/components/user/user-avatar'
import { INITIAL_PAGINATION } from '~/constants/admin'
import { PROPOSAL_STATUS_BADGE_VARIANT } from '~/constants/meme-proposal'
import {
  MemeProposalStatus,
  type MemeProposalUrlType
} from '~/db/generated/prisma/enums'
import { listAdminProposalsQueryOpts } from '~/queries/admin/proposal'
import { AdminTable } from '~/routes/admin/-components/admin-table'
import { FilterTab } from '~/routes/admin/-components/filter-tab'
import { FilterTabs } from '~/routes/admin/-components/filter-tabs'
import { PageHeader } from '~/routes/admin/-components/page-header'
import { RelativeDateTooltip } from '~/routes/admin/-components/relative-date-tooltip'
import { createAppColumnHelper, useAppTable } from '~/routes/admin/-lib/table'
import { ProposalActionsCell } from '~/routes/admin/proposals/-components/proposal-actions-cell'
import type { AdminProposal } from '~/server/admin/proposal/proposal.functions'

const routeApi = getRouteApi('/admin/proposals/')

const STATUS_LABELS = {
  [MemeProposalStatus.PENDING]: 'En attente',
  [MemeProposalStatus.APPROVED]: 'Approuvée',
  [MemeProposalStatus.REJECTED]: 'Rejetée'
} as const satisfies Record<MemeProposalStatus, string>

const URL_TYPE_CONFIG = {
  TWEET: { icon: XTwitterIcon, label: 'Tweet' },
  YOUTUBE: { icon: YoutubeIcon, label: 'YouTube' }
} as const satisfies Record<
  MemeProposalUrlType,
  { icon: React.ComponentType<React.ComponentProps<'svg'>>; label: string }
>

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: MemeProposalStatus.PENDING, label: 'En attente' },
  { value: MemeProposalStatus.APPROVED, label: 'Approuvées' },
  { value: MemeProposalStatus.REJECTED, label: 'Rejetées' }
] as const satisfies readonly {
  value: MemeProposalStatus | 'all'
  label: string
}[]

const columnHelper = createAppColumnHelper<AdminProposal>()

const getColumns = (now: number) => {
  return columnHelper.columns([
    columnHelper.accessor('user', {
      header: 'Utilisateur',
      enableSorting: false,
      cell: (info) => {
        const user = info.getValue()

        return (
          <div className="flex items-center gap-2">
            <UserAvatar name={user.name} image={user.image} />
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
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-32">{config.label}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
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

        return (
          <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]} size="sm">
            {STATUS_LABELS[status]}
          </Badge>
        )
      }
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      cell: (info) => {
        return (
          <RelativeDateTooltip date={new Date(info.getValue())} now={now} />
        )
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => {
        return <ProposalActionsCell proposal={info.row.original} />
      }
    })
  ])
}

type StatusFilterTabsProps = {
  currentStatus: MemeProposalStatus | 'all'
  statusCounts: Record<MemeProposalStatus | 'all', number>
}

const StatusFilterTabs = ({
  currentStatus,
  statusCounts
}: StatusFilterTabsProps) => {
  return (
    <FilterTabs>
      {STATUS_FILTER_OPTIONS.map((option) => {
        return (
          <FilterTab
            key={option.value}
            from="/admin/proposals/"
            search={{
              proposalStatus: option.value === 'all' ? undefined : option.value
            }}
            aria-selected={option.value === currentStatus}
            count={statusCounts[option.value]}
          >
            {option.label}
          </FilterTab>
        )
      })}
    </FilterTabs>
  )
}

type EmptyStateProps = {
  hasFilter: boolean
}

const EmptyState = ({ hasFilter }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Inbox className="size-12 mb-4 opacity-50" aria-hidden="true" />
      <p className="text-lg font-medium">Aucune proposition</p>
      <p className="text-sm">
        {hasFilter
          ? 'Aucune proposition ne correspond à ce filtre.'
          : "Les utilisateurs n'ont pas encore soumis de mèmes."}
      </p>
    </div>
  )
}

export const ProposalsPage = () => {
  const { proposalStatus } = routeApi.useSearch()
  const proposalsQuery = useSuspenseQuery(
    listAdminProposalsQueryOpts(proposalStatus)
  )

  const allCount =
    proposalsQuery.data.statusCounts[MemeProposalStatus.PENDING] +
    proposalsQuery.data.statusCounts[MemeProposalStatus.APPROVED] +
    proposalsQuery.data.statusCounts[MemeProposalStatus.REJECTED]

  const columns = React.useMemo(() => {
    return getColumns(proposalsQuery.dataUpdatedAt)
  }, [proposalsQuery.dataUpdatedAt])

  const table = useAppTable({
    data: proposalsQuery.data.proposals,
    columns,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: INITIAL_PAGINATION
    }
  })

  return (
    <Container>
      <PageHeader title="Propositions" />
      <div className="flex flex-col gap-6 py-6">
        <StatusFilterTabs
          currentStatus={proposalStatus ?? 'all'}
          statusCounts={{
            ...proposalsQuery.data.statusCounts,
            all: allCount
          }}
        />
        {proposalsQuery.data.proposals.length > 0 ? (
          <AdminTable table={table} caption="Liste des propositions" />
        ) : (
          <EmptyState hasFilter={proposalStatus !== undefined} />
        )}
      </div>
    </Container>
  )
}
