import React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const defaultValues = [4, 5, 6]

const MemesToggleGrid = ({
  columnValue,
  values = defaultValues,
  onColumnValueChange
}: {
  columnValue: number
  values?: number[]
  onColumnValueChange: (value: number) => void
}) => {
  const handleChange = (value: string) => {
    if (value) {
      onColumnValueChange(Number.parseInt(value, 10))
    }
  }

  return (
    <ToggleGroup
      size="default"
      variant="outline"
      type="single"
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

export default MemesToggleGrid
