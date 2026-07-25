import React from 'react'
import { Input } from '~/components/ui/input'
import { useSyncedInputValue } from '~/hooks/use-synced-input-value'

type SearchInputParams = {
  value: string
  placeholder: string
  onValueChange: (value: string) => void
}

export const SearchInput = React.memo(
  ({ value, placeholder, onValueChange }: SearchInputParams) => {
    const { inputRef, defaultValue, handleChange } = useSyncedInputValue({
      externalValue: value,
      onValueChange
    })

    return (
      <div className="flex w-full sm:max-w-xs items-center gap-2">
        <Input
          ref={inputRef}
          defaultValue={defaultValue}
          onChange={handleChange}
          type="search"
          placeholder={placeholder}
        />
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
