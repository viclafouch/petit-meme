import { EmptyMessage } from '~/routes/admin/-components/empty-message'

type DetailListRow = {
  id: string
  content: React.ReactNode
  subtitle?: React.ReactNode
  trailing: React.ReactNode
}

type DetailListParams = {
  rows: DetailListRow[]
  emptyLabel: string
}

export const DetailList = ({ rows, emptyLabel }: DetailListParams) => {
  if (rows.length === 0) {
    return <EmptyMessage>{emptyLabel}</EmptyMessage>
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        return (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {row.content}
              {row.subtitle ? (
                <span className="truncate text-xs text-muted-foreground">
                  {row.subtitle}
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {row.trailing}
            </div>
          </div>
        )
      })}
    </div>
  )
}
