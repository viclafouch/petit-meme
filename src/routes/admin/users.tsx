import type { UserWithRole } from 'better-auth/plugins'
import { formatDate } from 'date-fns'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import { AdminTable } from '@/components/admin/admin-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { getListUsers, removeUser } from '@/server/admin'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'

const DropdownMenuUser = ({ user }: { user: UserWithRole }) => {
  const router = useRouter()
  const { user: admin } = Route.useRouteContext()

  const banUserMutation = useMutation({
    mutationFn: async () => {
      await authClient.admin.banUser({
        userId: user.id,
        banReason: 'Spamming',
        banExpiresIn: 60 * 60 * 24 * 7
      })
    },
    onSuccess: () => {
      void router.invalidate()
    }
  })

  const unbanUserMutation = useMutation({
    mutationFn: async () => {
      await authClient.admin.unbanUser({
        userId: user.id
      })
    },
    onSuccess: () => {
      void router.invalidate()
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const promise = removeUser({ data: user.id })
      toast.promise(promise, {
        loading: 'Suppression en cours...',
        success: 'Utilisateur supprimé avec succès'
      })

      return promise
    },
    onSuccess: () => {
      void router.invalidate()
    }
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8 float-right"
          size="icon"
        >
          <EllipsisVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {user.role !== 'admin' ? (
          <>
            {user.banned ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  unbanUserMutation.mutate()
                }}
              >
                Débannir
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  banUserMutation.mutate()
                }}
              >
                Bannir
              </DropdownMenuItem>
            )}
          </>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          disabled={user.id === admin.id}
          onClick={() => {
            deleteUserMutation.mutate()
          }}
        >
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columnHelper = createColumnHelper<UserWithRole>()

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: (info) => {
      return info.getValue()
    }
  }),
  columnHelper.accessor('createdAt', {
    header: `Date de création`,
    cell: (info) => {
      return formatDate(info.getValue(), 'dd/MM/yyyy')
    }
  }),
  columnHelper.display({
    id: 'Actions',
    cell: (cell) => {
      const user = cell.row.original

      return <DropdownMenuUser user={user} />
    }
  })
]

const RouteComponent = () => {
  const data = Route.useLoaderData()

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data.listUsers.users,
    columns,
    getRowId: (row) => {
      return row.id.toString()
    },
    getCoreRowModel: getCoreRowModel()
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
    const listUsers = await getListUsers()

    return {
      crumb: 'Utilisateurs',
      listUsers
    }
  }
})
