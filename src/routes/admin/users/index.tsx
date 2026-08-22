import { Minus } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
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
import { RelativeDateTooltip } from '~/routes/admin/-components/relative-date-tooltip'
import {
  createAppColumnHelper,
  INITIAL_PAGINATION,
  useAppTable
} from '~/routes/admin/-lib/table'
import type { EnrichedUser } from '~/routes/admin/-server/users'
import { getListUsers } from '~/routes/admin/-server/users'
import { UserActionsCell } from './-components/user-actions-cell'
import {
  AuthProviderBadge,
  SubscriptionBadge,
  UserStatusBadges
} from './-components/user-badges'

const columnHelper = createAppColumnHelper<EnrichedUser>()

const columns = columnHelper.columns([
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
      const { subscription } = info.row.original

      if (subscription.status === 'none') {
        return (
          <span className="text-muted-foreground">
            <Minus className="size-4" aria-hidden />
            <span className="sr-only">Aucun abonnement</span>
          </span>
        )
      }

      return (
        <SubscriptionBadge
          isActive={subscription.status === 'active'}
          startedAt={subscription.startedAt}
          endsAt={subscription.endsAt}
        />
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
            {user.bookmarkCount} bookmarks · {user.generationCount} générations
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

      return <RelativeDateTooltip date={new Date(lastActivity)} />
    }
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => {
      return <UserActionsCell user={info.row.original} />
    }
  })
])

const RouteComponent = () => {
  const { users } = Route.useLoaderData()

  const table = useAppTable({
    data: users,
    columns,
    initialState: {
      sorting: [{ id: 'lastActiveAt', desc: true }],
      pagination: INITIAL_PAGINATION
    }
  })

  return (
    <Container>
      <PageHeader title="Utilisateurs" />
      <div className="py-10">
        <AdminTable table={table} caption="Liste des utilisateurs" />
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/users/')({
  component: RouteComponent,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Utilisateurs' }] }
  },
  loader: async () => {
    const { users } = await getListUsers()

    return {
      crumb: 'Utilisateurs',
      users
    }
  }
})
