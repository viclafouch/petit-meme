import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getFieldErrorMessage } from '@/lib/utils'
import type { AnyFieldApi } from '@tanstack/react-form'

type KeywordsFieldParams = {
  field: AnyFieldApi
  keywordValue: string
  setKeywordValue: (value: string) => void
  handleAddKeyword: () => void
  handleRemoveKeyword: (index: number) => void
}

export const KeywordsField = ({
  field,
  keywordValue,
  setKeywordValue,
  handleAddKeyword,
  handleRemoveKeyword
}: KeywordsFieldParams) => {
  const errorMessage = getFieldErrorMessage({ field })
  const keywords = field.state.value as string[]

  return (
    <FormItem error={errorMessage}>
      <FormLabel>Mots clés ({keywords.length})</FormLabel>
      <FormControl>
        <Input
          required
          type="text"
          name={field.name}
          onBlur={field.handleBlur}
          value={keywordValue}
          onChange={(event) => {
            setKeywordValue(event.target.value)
          }}
          enterKeyHint="done"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              handleAddKeyword()
            }
          }}
        />
      </FormControl>
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => {
            return (
              <Badge variant="secondary" key={keyword}>
                {keyword}
                <button
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleRemoveKeyword(index)
                  }}
                  aria-label="Supprimer"
                  type="button"
                  className="flex cursor-pointer items-center p-0 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : null}
      <FormMessage />
    </FormItem>
  )
}
