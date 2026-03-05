import { Crown, Mail, Minus, Twitter } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  differenceInMonths,
  formatDate,
  formatRelativeTime
} from '@/helpers/date'
import { getUserInitials } from '@/helpers/format'
import { getLocale } from '@/paraglide/runtime'
import { AdminTable, getRowId, PAGE_SIZE } from '@admin/-components/admin-table'
import type { EnrichedUser } from '@admin/-server/users'
import { getListUsers } from '@admin/-server/users'
import { createFileRoute } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { UserActionsCell } from './-components/user-actions-cell'

const DATE_WITH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}

type UserCellParams = {
  user: EnrichedUser
}

const UserStatusBadges = ({ user }: UserCellParams) => {
  const isBanned = user.banned === true
  const isUnverified = user.emailVerified === false
  const isActive = !isBanned && !isUnverified

  return (
    <div className="flex flex-wrap gap-1">
      {isActive ? (
        <Badge variant="success" size="sm">
          Actif
        </Badge>
      ) : null}
      {isBanned ? (
        <Badge variant="destructive" size="sm">
          Banni
        </Badge>
      ) : null}
      {isUnverified ? (
        <Badge variant="warning" size="sm">
          Non vérifié
        </Badge>
      ) : null}
    </div>
  )
}

const columnHelper = createColumnHelper<EnrichedUser>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Utilisateur',
    cell: (info) => {
      const user = info.row.original
      const isBanned = user.banned === true

      return (
        <div className="flex items-center gap-2">
          <Avatar
            className={isBanned ? 'size-8 ring-2 ring-destructive' : 'size-8'}
          >
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-xs">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium truncate max-w-32">{user.name}</span>
        </div>
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
      const provider = info.getValue()

      return provider === 'twitter' ? (
        <Badge variant="info" size="sm">
          <Twitter className="size-3" aria-hidden />
          Twitter
        </Badge>
      ) : (
        <Badge variant="secondary" size="sm">
          <Mail className="size-3" aria-hidden />
          Email
        </Badge>
      )
    }
  }),
  columnHelper.display({
    id: 'status',
    header: 'Statut',
    cell: (info) => {
      return <UserStatusBadges user={info.row.original} />
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

      const months = subscription.startedAt
        ? Math.max(
            1,
            differenceInMonths(new Date(), new Date(subscription.startedAt))
          )
        : 1

      const tooltipLines = [
        `${months} mois d'abonnement`,
        subscription.endsAt
          ? `Fin : ${formatDate(new Date(subscription.endsAt), getLocale())}`
          : null
      ]
        .filter(Boolean)
        .join('\n')

      const badge =
        subscription.status === 'active' ? (
          <Badge className="bg-amber-500 text-white border-amber-600" size="sm">
            <Crown className="size-3" aria-hidden />
            Premium
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            <Crown className="size-3" aria-hidden />
            Ancien
          </Badge>
        )

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{badge}</span>
          </TooltipTrigger>
          <TooltipContent className="whitespace-pre-line">
            {tooltipLines}
          </TooltipContent>
        </Tooltip>
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
          <TooltipTrigger asChild>
            <span
              className="text-muted-foreground text-sm tabular-nums cursor-default"
              aria-label={`${user.bookmarkCount} bookmarks, ${user.generationCount} générations`}
            >
              {user.bookmarkCount}b {user.generationCount}g
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {user.bookmarkCount} bookmarks · {user.generationCount} générations
          </TooltipContent>
        </Tooltip>
      )
    }
  }),
  columnHelper.accessor('lastActivityAt', {
    header: 'Dernière activité',
    cell: (info) => {
      const lastActivity = info.getValue()

      if (!lastActivity) {
        return <span className="text-muted-foreground text-sm">Jamais</span>
      }

      const date = new Date(lastActivity)

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm cursor-default">
              {formatRelativeTime(date, getLocale())}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {formatDate(date, getLocale(), DATE_WITH_TIME_OPTIONS)}
          </TooltipContent>
        </Tooltip>
      )
    }
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => {
      return <UserActionsCell user={info.row.original} />
    }
  })
]

const RouteComponent = () => {
  const { users } = Route.useLoaderData()

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not compatible with React Compiler (https://github.com/TanStack/table/issues/5903)
  const table = useReactTable({
    data: users,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: 'lastActivityAt', desc: true }],
      pagination: {
        pageSize: PAGE_SIZE
      }
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
