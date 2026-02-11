/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable complexity */

import * as React from 'react'
import { useEffect, useImperativeHandle, useRef } from 'react'
import { CheckIcon, ChevronDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { PopoverContentProps } from '@radix-ui/react-popover'

export type Option = {
  label: string
  value: string
}

type Props = {
  /**
   * An array of objects to be displayed in the Select.Option.
   */
  options: Option[]

  /**
   * Whether the select is async. If true, the getting options should be async.
   * Optional, defaults to false.
   */
  async?: boolean

  /**
   * Whether is fetching options. If true, the loading indicator will be shown.
   * Optional, defaults to false. Works only when async is true.
   */
  loading?: boolean

  /**
   * The error object. If true, the error message will be shown.
   * Optional, defaults to null. Works only when async is true.
   */
  error?: Error | null

  /** The default selected values when the component mounts. */
  defaultValue?: string[]

  /**
   * The selected values.
   * Optional, defaults to undefined.
   */
  value?: string[]

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to "Select options".
   */
  placeholder?: string

  /**
   * Placeholder text to be displayed when the search input is empty.
   * Optional, defaults to "Search...".
   */
  searchPlaceholder?: string

  /**
   * Maximum number of items to display. Extra selected items will be summarized.
   * Optional, defaults to 3.
   */
  maxCount?: number

  /**
   * The modality of the popover. When set to true, interaction with outside elements
   * will be disabled and only popover content will be visible to screen readers.
   * Optional, defaults to false.
   */
  modalPopover?: boolean

  /**
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string

  /**
   * Text to be displayed when the clear button is clicked.
   * Optional, defaults to "Clear".
   */
  clearText?: string

  /**
   * Text to be displayed when the close button is clicked.
   * Optional, defaults to "Close".
   */
  closeText?: string

  /**
   * Whether to hide the select all option.
   * Optional, defaults to false.
   */
  hideSelectAll?: boolean

  /**
   * Whether to clear search input when popover closes.
   * Optional, defaults to false.
   */
  clearSearchOnClose?: boolean

  /**
   * Controlled search value. If provided, the component will use this value instead of internal state.
   * Optional, defaults to undefined.
   */
  searchValue?: string

  /**
   * Additional options for the popover content.
   * Optional, defaults to null.
   * portal: Whether to use portal to render the popover content. !!!need to modify the popover component!!!
   */
  popoverOptions?: PopoverContentProps & {
    portal?: boolean
  }

  /**
   * Custom label function.
   * Optional, defaults to null.
   */
  labelFunc?: (
    option: Option,
    isSelected: boolean,
    index: number
  ) => React.ReactNode

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (value: string[]) => void

  /**
   * Callback function triggered when the search input changes.
   * Receives the search input value.
   */
  onSearch?: (value: string) => void
} & React.ButtonHTMLAttributes<HTMLButtonElement>

type MultiAsyncSelectRef = {
  setIsPopoverOpen: (open: boolean) => void
  setSearchValue: (value: string) => void
}

export const MultiAsyncSelect = React.forwardRef<MultiAsyncSelectRef, Props>(
  (
    {
      options,
      value,
      className,
      defaultValue = [],
      placeholder = 'Select...',
      searchPlaceholder = 'Search...',
      clearText = 'Clear',
      closeText = 'Close',
      maxCount = 3,
      modalPopover = false,
      loading = false,
      async = false,
      error = null,
      hideSelectAll = false,
      popoverOptions,
      labelFunc,
      onValueChange,
      onSearch,
      clearSearchOnClose = false,
      searchValue
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(defaultValue)
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
    const [searchValueState, setSearchValueState] = React.useState(
      searchValue || ''
    )
    const [reserveOptions, setReserveOptions] = React.useState<
      Record<string, Option>
    >({})
    const optionsRef = useRef<Record<string, Option>>({})
    const isInit = useRef(false)

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      // 如果按下的是回车键，则保持弹窗打开
      if (event.key === 'Enter') {
        setIsPopoverOpen(true)
      } else if (event.key === 'Backspace' && !event.currentTarget.value) {
        // 如果按下的是退格键并且输入框为空，则删除最后一个选中的值
        const newSelectedValues = [...selectedValues]
        newSelectedValues.pop()
        setSelectedValues(newSelectedValues)
        onValueChange(newSelectedValues)
      }
    }

    const toggleOption = (option: string) => {
      const isAddon = selectedValues.includes(option)
      const newSelectedValues = isAddon
        ? selectedValues.filter((value) => {
            return value !== option
          })
        : [...selectedValues, option]
      setSelectedValues(newSelectedValues)
      onValueChange(newSelectedValues)
    }

    const handleClear = () => {
      setSelectedValues([])
      onValueChange([])
    }

    const clearExtraOptions = () => {
      const newSelectedValues = selectedValues.slice(0, maxCount)
      setSelectedValues(newSelectedValues)
      onValueChange(newSelectedValues)
    }

    const toggleAll = () => {
      if (selectedValues.length === options.length) {
        handleClear()
      } else {
        const allValues = options.map((option) => {
          return option.value
        })
        setSelectedValues(allValues)
        onValueChange(allValues)
      }
    }

    // 使用 optionsRef 来记录 options 已选项目，同时控制其 size 减少对性能的影响
    useEffect(() => {
      const temp = options.reduce<Record<string, Option>>((acc, option) => {
        acc[option.value] = option

        return acc
      }, {})

      if (async) {
        // 初始化时，使用 options 来生成 optionsRef
        if (!isInit.current) {
          optionsRef.current = temp
          setReserveOptions(temp)
          isInit.current = true
        } else {
          // 当 options 变化时，仅保留上一次 selectedValues 中存在的选项
          const temp2 = selectedValues.reduce<Record<string, Option>>(
            (acc, value) => {
              const option = optionsRef.current[value]

              if (option) {
                acc[option.value] = option
              }

              return acc
            },
            {}
          )
          optionsRef.current = {
            ...temp,
            ...temp2
          }
          setReserveOptions({
            ...temp,
            ...temp2
          })
        }
      }
    }, [async, options, selectedValues])

    useEffect(() => {
      if (value) {
        setSelectedValues(value)
      }
    }, [value])

    useEffect(() => {
      if (searchValue !== undefined) {
        setSearchValueState(searchValue)
      }
    }, [searchValue])

    useImperativeHandle(ref, () => {
      return {
        setIsPopoverOpen,
        setSearchValue: setSearchValueState
      }
    })

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={(open) => {
          setIsPopoverOpen(open)

          if (!open && clearSearchOnClose) {
            setSearchValueState('')
            onSearch?.('')
          }
        }}
        modal={modalPopover}
      >
        <PopoverTrigger asChild>
          <div
            data-open={isPopoverOpen}
            aria-invalid={error !== null}
            className={cn(
              'dark:bg-input/30 border-input flex h-9 w-full rounded-md border bg-transparent px-1 py-1 text-base md:text-sm data-[open="true"]:border-ring data-[open="true"]:ring-ring/50 data-[open="true"]:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
              className
            )}
          >
            {selectedValues.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
                  {selectedValues.slice(0, maxCount).map((value) => {
                    let option: Option | undefined

                    if (async) {
                      option = reserveOptions[value]
                    } else {
                      option = options.find((option) => {
                        return option.value === value
                      })
                    }

                    return (
                      <div
                        className="h-[22px] flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-zinc-200 text-zinc-600 hover:text-primary dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-primary hover:border-zinc-400 dark:hover:border-zinc-600"
                        key={value}
                      >
                        <div className="flex items-center gap-1 truncate text-xs">
                          {option?.label}
                        </div>
                        <X
                          className="h-2 w-2 p-1 box-content shrink-0 cursor-pointer text-zinc-500 hover:bg-zinc-100 rounded-full dark:hover:bg-zinc-800"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleOption(value)
                          }}
                        />
                      </div>
                    )
                  })}
                  {selectedValues.length > maxCount ? (
                    <Badge variant="outline">
                      <span>{`+ ${selectedValues.length - maxCount}`}</span>
                      <X
                        className="ml-2 h-3 w-3 p-1 box-content shrink-0 cursor-pointer text-zinc-300 dark:text-zinc-500 hover:bg-zinc-100 hover:text-primary rounded-full dark:hover:bg-zinc-800"
                        onClick={(event) => {
                          event.stopPropagation()
                          clearExtraOptions()
                        }}
                      />
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <X
                    className="ml-2 h-4 w-4 p-1 box-content shrink-0 cursor-pointer text-zinc-300 dark:text-zinc-500 hover:bg-zinc-100 hover:text-primary rounded-full dark:hover:bg-zinc-800"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleClear()
                    }}
                  />
                  <Separator
                    orientation="vertical"
                    className="flex min-h-6 h-full mx-2"
                  />
                  <ChevronDown className="h-4 cursor-pointer text-zinc-300 dark:text-zinc-500 hover:text-primary" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto px-2">
                <span className="text-[12px] font-normal text-zinc-500">
                  {placeholder}
                </span>
                <ChevronDown className="h-4 cursor-pointer text-zinc-300 dark:text-zinc-500" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          onEscapeKeyDown={() => {
            setIsPopoverOpen(false)

            if (clearSearchOnClose) {
              setSearchValueState('')
              onSearch?.('')
            }
          }}
          {...{
            ...popoverOptions,
            className: cn('w-auto p-0', popoverOptions?.className),
            align: 'start',
            portal: popoverOptions?.portal
          }}
        >
          <Command shouldFilter={!async}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValueState}
              onValueChange={(value: string) => {
                setSearchValueState(value)

                if (onSearch) {
                  onSearch(value)
                }
              }}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              {async && error ? (
                <div className="p-4 text-destructive text-center">
                  {error.message}
                </div>
              ) : null}
              {async && loading && options.length === 0 ? (
                <div className="flex justify-center py-6 items-center h-full">
                  <LoadingSpinner />
                </div>
              ) : null}
              {async ? (
                !loading &&
                !error &&
                options.length === 0 && (
                  <div className="pt-6 pb-4 text-center text-xs">
                    Aucun résultat.
                  </div>
                )
              ) : (
                <CommandEmpty>Aucun résultat.</CommandEmpty>
              )}
              <CommandGroup>
                {/* 异步模式不需要全选 */}
                {!async && !hideSelectAll ? (
                  <CommandItem
                    key="all"
                    onSelect={toggleAll}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-1 size-4 flex items-center justify-center rounded-[4px] border border-primary shadow-xs transition-shadow outline-none',
                        selectedValues.length === options.length
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="size-3.5 text-white dark:text-black" />
                    </div>
                    <span>Tout sélectionner</span>
                  </CommandItem>
                ) : null}
                {options.map((option, index) => {
                  const isSelected = selectedValues.includes(option.value)

                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        return toggleOption(option.value)
                      }}
                      className="cursor-pointer text-xs"
                    >
                      <div
                        className={cn(
                          'mr-1 size-4 flex items-center justify-center rounded-[4px] border border-primary shadow-xs transition-shadow outline-none',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <CheckIcon className="size-3.5 text-white dark:text-black" />
                      </div>
                      <>
                        {labelFunc ? (
                          labelFunc(option, isSelected, index)
                        ) : (
                          <span>{option.label}</span>
                        )}
                      </>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {selectedValues.length > 0 ? (
                    <>
                      <CommandItem
                        onSelect={handleClear}
                        className="flex-1 justify-center cursor-pointer"
                      >
                        {clearText}
                      </CommandItem>
                      <Separator
                        orientation="vertical"
                        className="flex min-h-6 h-full mx-1"
                      />
                    </>
                  ) : null}
                  <CommandItem
                    onSelect={() => {
                      return setIsPopoverOpen(false)
                    }}
                    className="flex-1 justify-center cursor-pointer max-w-full"
                  >
                    {closeText}
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

MultiAsyncSelect.displayName = 'MultiAsyncSelect'
