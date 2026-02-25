import React from 'react'
import { differenceInMonths, formatDate, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Crown, EllipsisVertical, Mail, Minus, Twitter } from 'lucide-react'
import { toast } from 'sonner'
import { AdminTable, PAGE_SIZE } from '@/components/admin/admin-table'
import { PageHeader } from '@/components/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  BAN_REASONS,
  type BanReason,
  banUserById,
  type EnrichedUser,
  getListUsers,
  removeUser,
  unbanUserById
} from '@/server/admin'
import * as Sentry from '@sentry/tanstackstart-react'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

function getUserInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => {
      return part[0]
    })
    .join('')
    .toUpperCase()
}

type UserCellProps = {
  user: EnrichedUser
}

type DialogType = 'ban' | 'unban' | 'delete'

type ConfirmAlertDialogProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  actionLabel: string
  onConfirm: () => void
  children?: React.ReactNode
}

const ConfirmAlertDialog = ({
  isOpen,
  onClose,
  title,
  description,
  actionLabel,
  onConfirm,
  children
}: ConfirmAlertDialogProps) => {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const UserActionsCell = ({ user }: UserCellProps) => {
  const [activeDialog, setActiveDialog] = React.useState<DialogType | null>(
    null
  )
  const [banReason, setBanReason] = React.useState<BanReason>(BAN_REASONS[0])
  const router = useRouter()
  const { user: admin } = Route.useRouteContext()

  const handleCloseDialog = () => {
    setActiveDialog(null)
  }

  const handleMutationSuccess = () => {
    handleCloseDialog()
    void router.invalidate()
  }

  const handleMutationError = (
    error: Error,
    feature: 'admin-user-ban' | 'admin-user-unban' | 'admin-user-delete'
  ) => {
    toast.error(error.message)
    Sentry.captureException(error, { tags: { feature } })
  }

  const banMutation = useMutation({
    mutationFn: async () => {
      const promise = banUserById({
        data: { userId: user.id, banReason }
      })
      toast.promise(promise, {
        loading: 'Bannissement en cours...',
        success: 'Utilisateur banni'
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-ban')
    }
  })

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const promise = unbanUserById({ data: user.id })
      toast.promise(promise, {
        loading: 'Débannissement en cours...',
        success: 'Utilisateur débanni'
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-unban')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const promise = removeUser({ data: user.id })
      toast.promise(promise, {
        loading: 'Suppression en cours...',
        success: 'Utilisateur supprimé'
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-delete')
    }
  })

  const isOwnAccount = user.id === admin.id
  const isAdmin = user.role === 'admin'
  const hasActions = !isOwnAccount || !isAdmin

  if (!hasActions) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-9 ml-auto"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {!isAdmin && user.banned ? (
            <DropdownMenuItem
              onSelect={() => {
                setActiveDialog('unban')
              }}
            >
              Débannir
            </DropdownMenuItem>
          ) : null}
          {!isAdmin && !user.banned ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setActiveDialog('ban')
              }}
            >
              Bannir
            </DropdownMenuItem>
          ) : null}
          {!isOwnAccount ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setActiveDialog('delete')
              }}
            >
              Supprimer
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'ban'}
        onClose={handleCloseDialog}
        title={`Bannir ${user.name}`}
        description="Choisissez une raison pour le bannissement."
        actionLabel="Bannir"
        onConfirm={() => {
          banMutation.mutate()
        }}
      >
        <Select
          value={banReason}
          onValueChange={(value) => {
            setBanReason(value as BanReason)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAN_REASONS.map((reason) => {
              return (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </ConfirmAlertDialog>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'unban'}
        onClose={handleCloseDialog}
        title={`Débannir ${user.name}`}
        description="L'utilisateur pourra de nouveau accéder à la plateforme."
        actionLabel="Débannir"
        onConfirm={() => {
          unbanMutation.mutate()
        }}
      />
      <ConfirmAlertDialog
        isOpen={activeDialog === 'delete'}
        onClose={handleCloseDialog}
        title={`Supprimer ${user.name}`}
        description="Cette action est irréversible. Toutes les données de l'utilisateur seront supprimées."
        actionLabel="Supprimer"
        onConfirm={() => {
          deleteMutation.mutate()
        }}
      />
    </>
  )
}

const UserStatusBadges = ({ user }: UserCellProps) => {
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
          ? `Fin : ${formatDate(new Date(subscription.endsAt), 'dd/MM/yyyy')}`
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
            <span className="text-muted-foreground text-sm tabular-nums cursor-default">
              {user.memeCount}m {user.bookmarkCount}b {user.generationCount}g
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {user.memeCount} memes · {user.bookmarkCount} bookmarks ·{' '}
            {user.generationCount} générations
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
              {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {formatDate(date, 'dd/MM/yyyy HH:mm')}
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

function getRowId(row: EnrichedUser) {
  return row.id
}

const RouteComponent = () => {
  const data = Route.useLoaderData()

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not compatible with React Compiler (https://github.com/TanStack/table/issues/5903)
  const table = useReactTable({
    data: data.users,
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
      <div className="w-full mx-auto py-10">
        <AdminTable table={table} />
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/users')({
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
