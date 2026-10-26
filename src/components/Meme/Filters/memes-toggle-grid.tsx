import React from 'react'
import {
  RadioToggleGroup,
  RadioToggleGroupItem
} from '~/components/ui/radio-toggle-group'
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
  const handleChange = (nextValue: string) => {
    onColumnValueChange(Math.trunc(Number(nextValue)))
  }

  return (
    <RadioToggleGroup
      size="default"
      variant="outline"
      aria-label={m.meme_grid_columns()}
      value={columnValue.toString()}
      onValueChange={handleChange}
    >
      {values.map((value) => {
        return (
          <RadioToggleGroupItem key={value} value={value.toString()}>
            {value}
          </RadioToggleGroupItem>
        )
      })}
    </RadioToggleGroup>
  )
}

export { MemesToggleGrid }
