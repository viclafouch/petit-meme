import React from 'react'
import { Search, X } from 'lucide-react'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useMatch } from '@tanstack/react-router'
import { Kbd } from '~/components/ui/kbd'
import { m } from '~/paraglide/messages'
import { SearchSuggestionContent } from './search-suggestion'
import searchCss from './search.css?url'
import { useSearchNavigation } from './use-search-navigation'
import {
  SEARCH_GROUP_LABELS,
  useSearchSuggestions,
  type SearchSuggestion,
  type SearchSuggestionGroup
} from './use-search-suggestions'

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

  if (previousQuery !== currentQuery) {
    setPreviousQuery(currentQuery)
    setInputValue(currentQuery)
  }

  const focusSearch = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  useHotkey('/', focusSearch, { meta: { name: m.search_label() } })
  useHotkey('Mod+K', focusSearch, { meta: { name: m.search_label() } })

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
    <search className="navbar-search">
      <link rel="stylesheet" href={searchCss} precedence="default" />
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
          open={isOpen}
          onOpenChange={setIsOpen}
          onItemHighlighted={(suggestion: SearchSuggestion | undefined) => {
            highlightedRef.current = suggestion
          }}
          openOnInputClick
          itemToStringValue={(item: SearchSuggestion) => {
            return item.kind === 'category' ? item.category.title : inputValue
          }}
        >
          <div className="navbar-search-field">
            <Search aria-hidden="true" className="navbar-search-icon" />
            <Autocomplete.Input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              placeholder={m.search_placeholder()}
              aria-label={m.search_label()}
              className="navbar-search-input"
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
                className="navbar-search-kbd pointer-coarse:hidden"
                aria-hidden="true"
              >
                /
              </Kbd>
            ) : (
              <Autocomplete.Clear
                className="navbar-search-clear"
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
              className="navbar-search-positioner"
              sideOffset={8}
              align="start"
            >
              <Autocomplete.Popup className="navbar-search-popup">
                <Autocomplete.List>
                  {(group: SearchSuggestionGroup) => {
                    return (
                      <Autocomplete.Group
                        key={group.id}
                        items={group.items}
                        className="search-suggestion-group"
                        data-layout={group.layout}
                      >
                        <Autocomplete.GroupLabel className="search-suggestion-heading">
                          {SEARCH_GROUP_LABELS[group.id]()}
                        </Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(suggestion: SearchSuggestion) => {
                            return (
                              <Autocomplete.Item
                                key={suggestion.id}
                                value={suggestion}
                                className="search-suggestion"
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
