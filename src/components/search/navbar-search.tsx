import React from 'react'
import { Search, X } from 'lucide-react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useMatch } from '@tanstack/react-router'
import { Kbd } from '~/components/ui/kbd'
import { useIsLargeScreen } from '~/hooks/use-is-large-screen'
import { m } from '~/paraglide/messages'
import { SearchSuggestionContent } from './search-suggestion'
import {
  SUGGESTION_GROUP_CLASS_NAMES,
  SUGGESTION_HEADING_CLASS_NAMES,
  SUGGESTION_ITEM_CLASS_NAMES
} from './search-suggestion-classes'
import {
  SEARCH_GROUP_LABELS,
  type SearchSuggestion,
  type SearchSuggestionGroup
} from './search-suggestion-groups'
import { useSearchNavigation } from './use-search-navigation'
import { useSearchSuggestions } from './use-search-suggestions'

const useCurrentQuery = () => {
  const categoryMatch = useMatch({
    from: '/_public__root/memes/category/$slug',
    shouldThrow: false
  })

  return categoryMatch ? (categoryMatch.search.query ?? '') : ''
}

export const NavbarSearch = () => {
  const currentQuery = useCurrentQuery()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const highlightedRef = React.useRef<SearchSuggestion | undefined>(undefined)
  const [inputValue, setInputValue] = React.useState(currentQuery)
  const [previousQuery, setPreviousQuery] = React.useState(currentQuery)
  const [isOpen, setIsOpen] = React.useState(false)
  const { groups } = useSearchSuggestions(inputValue, isOpen)
  const { showResults, selectSuggestion } = useSearchNavigation()
  const isLargeScreen = useIsLargeScreen()

  if (previousQuery !== currentQuery) {
    setPreviousQuery(currentQuery)
    setInputValue(currentQuery)
  }

  const focusSearch = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  useHotkey('/', focusSearch, {
    enabled: isLargeScreen,
    meta: { name: m.search_label() }
  })
  useHotkey('Mod+K', focusSearch, {
    enabled: isLargeScreen,
    meta: { name: m.search_label() }
  })

  const closeAndBlur = () => {
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleSelect = (suggestion: SearchSuggestion) => {
    closeAndBlur()

    if (suggestion.kind === 'category') {
      setInputValue('')
    }

    selectSuggestion(suggestion)
  }

  return (
    <search className="min-w-0 flex-1">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          closeAndBlur()
          showResults(inputValue.trim())
        }}
      >
        <Autocomplete.Root
          items={groups}
          filter={null}
          value={inputValue}
          onValueChange={(nextValue, details) => {
            if (details.reason !== 'item-press') {
              setInputValue(nextValue)
            }
          }}
          open={isOpen && groups.length > 0}
          onOpenChange={setIsOpen}
          onItemHighlighted={(suggestion: SearchSuggestion | undefined) => {
            highlightedRef.current = suggestion
          }}
          openOnInputClick
          itemToStringValue={(item: SearchSuggestion) => {
            return item.kind === 'category' ? item.category.title : inputValue
          }}
        >
          <div className="relative flex h-10 items-center rounded-full bg-secondary inset-ring inset-ring-foreground/6 transition-[background-color,box-shadow] focus-within:bg-background focus-within:ring-4 focus-within:ring-ring/25 focus-within:inset-ring-ring">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground"
            />
            <Autocomplete.Input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              placeholder={m.search_placeholder()}
              aria-label={m.search_label()}
              className="size-full rounded-[inherit] bg-transparent pr-11 pl-10 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              onFocus={() => {
                setIsOpen(true)
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.nativeEvent.isComposing &&
                  !highlightedRef.current
                ) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            {inputValue === '' ? (
              <Kbd
                className="absolute right-3 pointer-coarse:hidden"
                aria-hidden="true"
              >
                /
              </Kbd>
            ) : (
              <Autocomplete.Clear
                className="absolute right-1 grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground focus-visible:focus-ring mouse:hover:bg-foreground/10 mouse:hover:text-foreground [&_svg]:size-4"
                aria-label={m.search_clear()}
                onClick={() => {
                  setInputValue('')
                }}
              >
                <X aria-hidden="true" />
              </Autocomplete.Clear>
            )}
          </div>
          <Autocomplete.Portal>
            <Autocomplete.Positioner
              className="z-(--z-celebration) w-(--anchor-width) outline-none"
              sideOffset={8}
              align="start"
            >
              <Autocomplete.Popup className="max-h-[min(35rem,var(--available-height))] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-2xl bg-popover p-2 text-popover-foreground shadow-(--shadow-sheet) ring-1 ring-foreground/10 transition-[opacity,scale] duration-150 ease-(--ease-out-strong) data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
                <Autocomplete.List>
                  {(group: SearchSuggestionGroup) => {
                    return (
                      <Autocomplete.Group
                        key={group.id}
                        items={group.items}
                        className={SUGGESTION_GROUP_CLASS_NAMES[group.layout]}
                      >
                        <Autocomplete.GroupLabel
                          className={
                            SUGGESTION_HEADING_CLASS_NAMES[group.layout]
                          }
                        >
                          {SEARCH_GROUP_LABELS[group.id]()}
                        </Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(suggestion: SearchSuggestion) => {
                            return (
                              <Autocomplete.Item
                                key={suggestion.id}
                                value={suggestion}
                                className={
                                  SUGGESTION_ITEM_CLASS_NAMES[group.layout]
                                }
                                data-kind={suggestion.kind}
                                onClick={() => {
                                  handleSelect(suggestion)
                                }}
                              >
                                <SearchSuggestionContent
                                  suggestion={suggestion}
                                />
                              </Autocomplete.Item>
                            )
                          }}
                        </Autocomplete.Collection>
                      </Autocomplete.Group>
                    )
                  }}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      </form>
    </search>
  )
}
