import React from 'react'
import { Minus } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import { UserAvatar } from '~/components/user-avatar'
import { AdminTable } from '~/routes/admin/-components/admin-table'
import { EmptyCell } from '~/routes/admin/-components/empty-cell'
import { FilterTab } from '~/routes/admin/-components/filter-tab'
import { FilterTabs } from '~/routes/admin/-components/filter-tabs'
import { RelativeDateTooltip } from '~/routes/admin/-components/relative-date-tooltip'
import { INITIAL_PAGINATION } from '~/routes/admin/-lib/constants'
import {
  getPremiumStatus,
  type PremiumSource
} from '~/routes/admin/-lib/premium'
import { getAdminUsersListQueryOpts } from '~/routes/admin/-lib/queries'
import { createAppColumnHelper, useAppTable } from '~/routes/admin/-lib/table'
import type { EnrichedUser } from '~/routes/admin/-server/users'
import { UserActionsCell } from '~/routes/admin/users/-components/user-actions-cell'
import {
  AuthProviderBadge,
  PremiumBadges,
  UserStatusBadges
} from '~/routes/admin/users/-components/user-badges'

const routeApi = getRouteApi('/admin/users/')

type PremiumFilter = PremiumSource | 'all'

const PREMIUM_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'paid', label: 'Payants' },
  { value: 'granted', label: 'Offerts' },
  { value: 'none', label: 'Sans Premium' }
] as const satisfies readonly { value: PremiumFilter; label: string }[]

type PremiumFilterTabsProps = {
  currentFilter: PremiumFilter
  counts: Record<PremiumFilter, number>
}

const PremiumFilterTabs = ({
  currentFilter,
  counts
}: PremiumFilterTabsProps) => {
  return (
    <FilterTabs>
      {PREMIUM_FILTER_OPTIONS.map((option) => {
        return (
          <FilterTab
            key={option.value}
            from="/admin/users/"
            search={{
              premium: option.value === 'all' ? undefined : option.value
            }}
            aria-selected={option.value === currentFilter}
            count={counts[option.value]}
          >
            {option.label}
          </FilterTab>
        )
      })}
    </FilterTabs>
  )
}

const countUsersByPremiumSource = (
  users: EnrichedUser[]
): Record<PremiumFilter, number> => {
  const usersBySource = Object.groupBy(users, (user) => {
    return getPremiumStatus(user).source
  })

  return {
    all: users.length,
    paid: usersBySource.paid?.length ?? 0,
    granted: usersBySource.granted?.length ?? 0,
    none: usersBySource.none?.length ?? 0
  }
}

const columnHelper = createAppColumnHelper<EnrichedUser>()

const getColumns = (now: number) => {
  return columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Utilisateur',
      cell: (info) => {
        const user = info.row.original

        return (
          <Link
            to="/admin/users/$userId"
            params={{ userId: user.id }}
            className="flex items-center gap-2 py-1 hover:text-primary transition-colors"
          >
            <UserAvatar
              name={user.name}
              image={user.image}
              email={user.email}
              className={user.banned === true ? 'ring-2 ring-destructive' : ''}
            />
            <span className="font-medium truncate max-w-32">{user.name}</span>
          </Link>
        )
      }
    }),
    columnHelper.accessor('email', {
      header: 'Email'
    }),
    columnHelper.accessor('role', {
      header: 'Rôle',
      cell: (info) => {
        const role = info.getValue()

        return role === 'admin' ? (
          <Badge variant="default" size="sm">
            Admin
          </Badge>
        ) : (
          <Badge variant="secondary" size="sm">
            User
          </Badge>
        )
      }
    }),
    columnHelper.accessor('provider', {
      header: 'Provider',
      enableSorting: false,
      cell: (info) => {
        return <AuthProviderBadge provider={info.getValue()} />
      }
    }),
    columnHelper.display({
      id: 'status',
      header: 'Statut',
      cell: (info) => {
        const user = info.row.original

        return (
          <UserStatusBadges
            banned={user.banned}
            emailVerified={user.emailVerified}
          />
        )
      }
    }),
    columnHelper.display({
      id: 'subscription',
      header: 'Abo',
      cell: (info) => {
        const { subscription, premiumGrantedAt } = info.row.original

        return (
          <div className="flex flex-wrap gap-1">
            <PremiumBadges
              premiumGrantedAt={premiumGrantedAt}
              subscription={subscription}
              emptyFallback={
                <span className="text-muted-foreground">
                  <Minus className="size-4" aria-hidden />
                  <span className="sr-only">Aucun abonnement</span>
                </span>
              }
            />
          </div>
        )
      }
    }),
    columnHelper.display({
      id: 'engagement',
      header: 'Engagement',
      cell: (info) => {
        const user = info.row.original

        return (
          <Tooltip>
            <TooltipTrigger
              className="text-muted-foreground text-sm tabular-nums cursor-default rounded-sm"
              aria-label={`${user.bookmarkCount} bookmarks, ${user.generationCount} générations`}
            >
              {user.bookmarkCount}b {user.generationCount}g
            </TooltipTrigger>
            <TooltipContent>
              {user.bookmarkCount} bookmarks · {user.generationCount}{' '}
              générations
            </TooltipContent>
          </Tooltip>
        )
      }
    }),
    columnHelper.accessor('lastActiveAt', {
      header: 'Dernière activité',
      cell: (info) => {
        const lastActivity = info.getValue()

        if (!lastActivity) {
          return <EmptyCell />
        }

        return <RelativeDateTooltip date={new Date(lastActivity)} now={now} />
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => {
        return <UserActionsCell user={info.row.original} />
      }
    })
  ])
}

export const UsersPage = () => {
  const { premium } = routeApi.useSearch()
  const usersListQuery = useSuspenseQuery(getAdminUsersListQueryOpts())

  const columns = React.useMemo(() => {
    return getColumns(usersListQuery.dataUpdatedAt)
  }, [usersListQuery.dataUpdatedAt])

  const premiumCounts = React.useMemo(() => {
    return countUsersByPremiumSource(usersListQuery.data.users)
  }, [usersListQuery.data.users])

  const filteredUsers = React.useMemo(() => {
    if (!premium) {
      return usersListQuery.data.users
    }

    return usersListQuery.data.users.filter((user) => {
      return getPremiumStatus(user).source === premium
    })
  }, [usersListQuery.data.users, premium])

  const table = useAppTable({
    data: filteredUsers,
    columns,
    initialState: {
      sorting: [{ id: 'lastActiveAt', desc: true }],
      pagination: INITIAL_PAGINATION
    }
  })

  return (
    <Container>
      <PageHeader title="Utilisateurs" />
      <div className="flex flex-col gap-6 py-6">
        <PremiumFilterTabs
          currentFilter={premium ?? 'all'}
          counts={premiumCounts}
        />
        <AdminTable table={table} caption="Liste des utilisateurs" />
      </div>
    </Container>
  )
}
