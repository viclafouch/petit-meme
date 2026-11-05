import { getLocale } from '~/paraglide/runtime'

export type StatTileEntry = {
  key: string
  label: string
  value: number
  icon: React.ReactNode
}

type StatTilesProps = {
  tiles: StatTileEntry[]
}

export const StatTiles = ({ tiles }: StatTilesProps) => {
  const locale = getLocale()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-stat-tiles sm:gap-4">
      {tiles.map((tile) => {
        return (
          <div
            key={tile.key}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 sm:gap-4 sm:p-5"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {tile.icon}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-lg font-bold tabular-nums">
                {tile.value.toLocaleString(locale)}
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">
                {tile.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
