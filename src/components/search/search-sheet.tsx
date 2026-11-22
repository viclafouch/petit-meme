import React from 'react'
import { Search } from 'lucide-react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { TAB_ITEM_CLASS } from '~/components/layout/tab-bar/tab-item-class'
import { Button } from '~/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { m } from '~/paraglide/messages'
import { SearchSuggestionContent } from './search-suggestion'
import searchCss from './search.css?url'
import { useSearchNavigation } from './use-search-navigation'
import {
  SEARCH_GROUP_LABELS,
  useSearchSuggestions,
  type SearchSuggestion
} from './use-search-suggestions'

const SWIPE_BLUR_THRESHOLD_PX = 10

const searchSheetHandle = DrawerPrimitive.createHandle()

const closeSearchSheet = () => {
  searchSheetHandle.close()
}

const blurInputWhenSwiped = (
  popup: HTMLDivElement | null,
  input: HTMLInputElement | null
) => {
  if (!popup) {
    return () => {}
  }

  const swipeObserver = new MutationObserver(() => {
    const swipeMovement = Number.parseFloat(
      popup.style.getPropertyValue('--drawer-swipe-movement-y')
    )

    if (swipeMovement > SWIPE_BLUR_THRESHOLD_PX) {
      input?.blur()
    }
  })

  swipeObserver.observe(popup, {
    attributes: true,
    attributeFilter: ['style']
  })

  return () => {
    swipeObserver.disconnect()
  }
}

export const SearchSheet = () => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const { groups, isPending } = useSearchSuggestions(inputValue, isOpen)
  const { showResults, selectSuggestion } = useSearchNavigation()

  const handleSelect = (suggestion: SearchSuggestion) => {
    closeSearchSheet()
    selectSuggestion(suggestion)
  }

  return (
    <Drawer
      handle={searchSheetHandle}
      showSwipeHandle
      onOpenChange={setIsOpen}
      onOpenChangeComplete={(hasOpened) => {
        if (hasOpened) {
          inputRef.current?.focus()
        }
      }}
    >
      <DrawerTrigger className={TAB_ITEM_CLASS}>
        <Search aria-hidden="true" />
        {m.nav_search()}
      </DrawerTrigger>
      <DrawerPrimitive.VirtualKeyboardProvider>
        <DrawerContent
          showCloseButton={false}
          initialFocus={false}
          className="h-[calc(100dvh-6rem)]"
          ref={(popup) => {
            return blurInputWhenSwiped(popup, inputRef.current)
          }}
        >
          <link rel="stylesheet" href={searchCss} precedence="default" />
          <DrawerTitle className="sr-only">{m.nav_search()}</DrawerTitle>
          <search className="search-sheet-bar">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                closeSearchSheet()
                showResults(inputValue.trim())
              }}
            >
              <div className="search-sheet-field">
                <Search aria-hidden="true" />
                <Input
                  ref={inputRef}
                  className="h-11 rounded-full border-0 bg-secondary pr-4 pl-10 text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:inset-ring focus-visible:inset-ring-ring dark:bg-secondary"
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={inputValue}
                  placeholder={m.search_placeholder()}
                  aria-label={m.search_label()}
                  onChange={(event) => {
                    setInputValue(event.target.value)
                  }}
                />
              </div>
              <DrawerClose render={<Button variant="ghost" />}>
                {m.common_cancel()}
              </DrawerClose>
            </form>
          </search>
          <div className="search-sheet-body" aria-busy={isPending || undefined}>
            {groups.map((group) => {
              return (
                <section
                  key={group.id}
                  className="search-suggestion-group"
                  data-layout={group.layout}
                  aria-label={SEARCH_GROUP_LABELS[group.id]()}
                >
                  <h2 className="search-suggestion-heading">
                    {SEARCH_GROUP_LABELS[group.id]()}
                  </h2>
                  <ul>
                    {group.items.map((suggestion) => {
                      return (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            className="search-suggestion"
                            data-kind={suggestion.kind}
                            onClick={() => {
                              handleSelect(suggestion)
                            }}
                          >
                            <SearchSuggestionContent suggestion={suggestion} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </DrawerContent>
      </DrawerPrimitive.VirtualKeyboardProvider>
    </Drawer>
  )
}
