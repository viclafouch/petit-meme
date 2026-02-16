import React from 'react'
import { removeDuplicates } from '@/utils/array'

type UseKeywordsFieldParams = {
  setKeywordsValue: (updater: (prev: string[]) => string[]) => void
}

export function useKeywordsField({ setKeywordsValue }: UseKeywordsFieldParams) {
  const [keywordValue, setKeywordValue] = React.useState('')

  const handleAddKeyword = () => {
    if (keywordValue.trim()) {
      setKeywordsValue((prevState) => {
        return removeDuplicates([
          ...prevState,
          ...keywordValue
            .split(',')
            .map((keyword) => {
              return keyword.trim().toLowerCase()
            })
            .filter((word) => {
              return Boolean(word.trim())
            })
        ])
      })
    }

    setKeywordValue('')
  }

  const handleRemoveKeyword = (keywordIndex: number) => {
    setKeywordsValue((prevState) => {
      return prevState.filter((_, index) => {
        return index !== keywordIndex
      })
    })
  }

  return {
    keywordValue,
    setKeywordValue,
    handleAddKeyword,
    handleRemoveKeyword
  }
}
