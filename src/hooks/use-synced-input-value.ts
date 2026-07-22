import React from 'react'
import { useDebouncedCallback } from '@tanstack/react-pacer'

const SYNC_DEBOUNCE_WAIT = 300

type UseSyncedInputValueParams = {
  externalValue: string
  onValueChange: (value: string) => void
}

export const useSyncedInputValue = ({
  externalValue,
  onValueChange
}: UseSyncedInputValueParams) => {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const input = inputRef.current
    const isInputFocused = document.activeElement === input

    if (input && !isInputFocused && input.value !== externalValue) {
      input.value = externalValue
    }
  }, [externalValue])

  const debouncedOnValueChange = useDebouncedCallback(onValueChange, {
    wait: SYNC_DEBOUNCE_WAIT,
    leading: false
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedOnValueChange(event.target.value)
  }

  return { inputRef, defaultValue: externalValue, handleChange }
}
