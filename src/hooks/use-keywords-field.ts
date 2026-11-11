import React from 'react'
import { removeDuplicates } from '~/helpers/array'
import { parseKeywordsInput } from '~/helpers/keywords'

type UseKeywordsFieldParams = {
  setKeywordsValue: (updater: (prev: string[]) => string[]) => void
}

export function useKeywordsField({ setKeywordsValue }: UseKeywordsFieldParams) {
  const [keywordValue, setKeywordValue] = React.useState('')

  const handleAddKeyword = () => {
    if (keywordValue.trim() !== '') {
      setKeywordsValue((prevState) => {
        return removeDuplicates([
          ...prevState,
          ...parseKeywordsInput(keywordValue)
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
