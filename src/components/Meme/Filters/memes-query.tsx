import React from 'react'
import { Input } from '~/components/ui/input'
import { m } from '~/paraglide/messages.js'

type MemesQueryParams = {
  query: string
  onQueryChange: (query: string) => void
}

export const MemesQuery = React.memo(
  ({ query, onQueryChange }: MemesQueryParams) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value)
    }

    return (
      <div className="flex w-full sm:max-w-xs items-center gap-2">
        <Input
          value={query}
          onChange={handleChange}
          type="search"
          placeholder={m.meme_search_placeholder()}
        />
      </div>
    )
  }
)

MemesQuery.displayName = 'MemesQuery'
