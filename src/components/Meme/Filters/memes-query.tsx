import React from 'react'
import { Input } from '~/components/ui/input'
import { useSyncedInputValue } from '~/hooks/use-synced-input-value'
import { m } from '~/paraglide/messages.js'

type MemesQueryParams = {
  query: string
  onQueryChange: (query: string) => void
}

export const MemesQuery = React.memo(
  ({ query, onQueryChange }: MemesQueryParams) => {
    const { inputRef, defaultValue, handleChange } = useSyncedInputValue({
      externalValue: query,
      onValueChange: onQueryChange
    })

    return (
      <div className="flex w-full sm:max-w-xs items-center gap-2">
        <Input
          ref={inputRef}
          defaultValue={defaultValue}
          onChange={handleChange}
          type="search"
          placeholder={m.meme_search_placeholder()}
        />
      </div>
    )
  }
)

MemesQuery.displayName = 'MemesQuery'
