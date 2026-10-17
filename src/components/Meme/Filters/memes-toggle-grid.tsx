import React from 'react'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { MEME_GRID_COLUMNS } from '~/constants/meme'
import { m } from '~/paraglide/messages.js'

const DEFAULT_COLUMN_VALUES = [
  MEME_GRID_COLUMNS.SMALL,
  MEME_GRID_COLUMNS.MEDIUM,
  MEME_GRID_COLUMNS.LARGE
] as const satisfies readonly number[]

type MemesToggleGridProps = {
  columnValue: number
  onColumnValueChange: (value: number) => void
  values?: readonly number[]
}

const MemesToggleGrid = ({
  columnValue,
  values = DEFAULT_COLUMN_VALUES,
  onColumnValueChange
}: MemesToggleGridProps) => {
  const handleChange = (value: string) => {
    if (value !== '') {
      onColumnValueChange(Math.trunc(Number(value)))
    }
  }

  return (
    <ToggleGroup
      size="default"
      variant="outline"
      type="single"
      aria-label={m.meme_grid_columns()}
      value={columnValue.toString()}
      onValueChange={handleChange}
    >
      {values.map((value) => {
        return (
          <ToggleGroupItem key={value} value={value.toString()}>
            {value}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export { MemesToggleGrid }
