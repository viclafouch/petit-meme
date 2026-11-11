import React from 'react'
import { Activity, Hash, Search, CircleX } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import { Badge } from '~/components/ui/badge'
import { Container } from '~/components/ui/container'
import { UserAvatar } from '~/components/user/user-avatar'
import { INITIAL_PAGINATION } from '~/constants/admin'
import { listAdminAiSearchLogsQueryOpts } from '~/queries/admin/ai-search'
import { AdminTable } from '~/routes/admin/-components/admin-table'
import { PageHeader } from '~/routes/admin/-components/page-header'
import { RelativeDateTooltip } from '~/routes/admin/-components/relative-date-tooltip'
import { createAppColumnHelper, useAppTable } from '~/routes/admin/-lib/table'
import type { AdminAiSearchLog } from '~/server/admin/ai-search/ai-search.functions'

const columnHelper = createAppColumnHelper<AdminAiSearchLog>()

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
    columnHelper.accessor('prompt', {
      header: 'Prompt',
      cell: (info) => {
        return (
          <p className="min-w-64 max-w-md text-sm whitespace-normal text-pretty wrap-break-word">
            {info.getValue()}
          </p>
        )
      }
    }),
    columnHelper.accessor('keywords', {
      header: 'Mots-clés',
      cell: (info) => {
        return (
          <div className="flex max-w-48 flex-wrap gap-1">
            {info.getValue().map((keyword) => {
              return (
                <Badge
                  key={keyword}
                  variant="secondary"
                  size="sm"
                  className="max-w-full"
                  title={keyword}
                >
                  <span className="truncate">{keyword}</span>
                </Badge>
              )
            })}
          </div>
        )
      }
    }),
    columnHelper.accessor('resultCount', {
      header: 'Résultats',
      cell: (info) => {
        const count = info.getValue()

        return (
          <Badge variant={count === 0 ? 'destructive' : 'outline'} size="sm">
            {count}
          </Badge>
        )
      }
    }),
    columnHelper.accessor('locale', {
      header: 'Locale',
      enableSorting: false,
      cell: (info) => {
        const locale = info.getValue()
        const FlagComponent = LOCALE_FLAGS[locale]

        return <FlagComponent className={FLAG_ICON_CLASS} aria-label={locale} />
      }
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      cell: (info) => {
        return (
          <RelativeDateTooltip date={new Date(info.getValue())} now={now} />
        )
      }
    })
  ])
}

type StatCardProps = {
  label: string
  value: number
  icon: React.ReactNode
}

const StatCard = ({ label, value, icon }: StatCardProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </div>
  )
}

export const AiSearchPage = () => {
  const logsQuery = useSuspenseQuery(listAdminAiSearchLogsQueryOpts())

  const columns = React.useMemo(() => {
    return getColumns(logsQuery.dataUpdatedAt)
  }, [logsQuery.dataUpdatedAt])

  const table = useAppTable({
    data: logsQuery.data.logs,
    columns,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: INITIAL_PAGINATION
    }
  })

  return (
    <Container>
      <PageHeader title="Recherche IA" />
      <div className="flex flex-col gap-6 py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total recherches"
            value={logsQuery.data.stats.totalCount}
            icon={<Hash className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="Aujourd'hui"
            value={logsQuery.data.stats.todayCount}
            icon={<Activity className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="Affichées"
            value={logsQuery.data.stats.displayedCount}
            icon={<Search className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="0 résultat"
            value={logsQuery.data.stats.zeroResultCount}
            icon={<CircleX className="size-5" aria-hidden="true" />}
          />
        </div>
        <AdminTable table={table} caption="Logs de recherche IA" />
      </div>
    </Container>
  )
}
