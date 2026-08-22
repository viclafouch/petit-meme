import React from 'react'
import { AI_SEARCH_PROMPT_STORAGE_KEY } from '~/constants/ai-search'

const handOverPrompt = (prompt: string) => {
  sessionStorage.setItem(AI_SEARCH_PROMPT_STORAGE_KEY, prompt)
}

export const useAiSearchPrompt = () => {
  const [prompt, setPrompt] = React.useState('')

  React.useEffect(() => {
    const handedOverPrompt = sessionStorage.getItem(
      AI_SEARCH_PROMPT_STORAGE_KEY
    )

    if (handedOverPrompt) {
      sessionStorage.removeItem(AI_SEARCH_PROMPT_STORAGE_KEY)
      // oxlint-disable-next-line react/react-compiler -- reading sessionStorage is what this effect is for, and its value cannot be known during the render that the server also runs
      setPrompt(handedOverPrompt)
    }
  }, [])

  return { prompt, setPrompt, handOverPrompt }
}
