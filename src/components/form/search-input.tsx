import React from 'react'
import { useSyncedInputValue } from '~/components/form/use-synced-input-value'
import { Input } from '~/components/ui/input'

type SearchInputProps = {
  value: string
  placeholder: string
  onValueChange: (value: string) => void
}

export const SearchInput = React.memo(
  ({ value, placeholder, onValueChange }: SearchInputProps) => {
    const { inputRef, defaultValue, handleChange } = useSyncedInputValue({
      externalValue: value,
      onValueChange
    })

    return (
      <search className="flex w-full sm:max-w-xs items-center gap-2">
        <Input
          ref={inputRef}
          defaultValue={defaultValue}
          onChange={handleChange}
          type="search"
          enterKeyHint="search"
          spellCheck={false}
          autoCapitalize="none"
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </search>
    )
  }
)

SearchInput.displayName = 'SearchInput'
