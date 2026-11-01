import { Plus, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '~/components/ui/input-group'
import { useFieldContext } from '~/hooks/form-context'
import { matchIsFieldInvalid } from '~/lib/form'

type KeywordsFieldProps = {
  keywordValue: string
  setKeywordValue: (value: string) => void
  handleAddKeyword: () => void
  handleRemoveKeyword: (index: number) => void
}

export const KeywordsField = ({
  keywordValue,
  setKeywordValue,
  handleAddKeyword,
  handleRemoveKeyword
}: KeywordsFieldProps) => {
  const field = useFieldContext<string[]>()
  const isInvalid = matchIsFieldInvalid(field.state.meta)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>
        Mots-clés
        <span className="text-muted-foreground tabular-nums">
          {field.state.value.length}
        </span>
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={field.name}
          name={field.name}
          placeholder="chat, surprise, réaction..."
          aria-invalid={isInvalid}
          value={keywordValue}
          enterKeyHint="done"
          onBlur={() => {
            handleAddKeyword()
            field.handleBlur()
          }}
          onChange={(event) => {
            setKeywordValue(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              handleAddKeyword()
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            disabled={keywordValue.trim() === ''}
            onClick={handleAddKeyword}
          >
            <Plus data-icon="inline-start" aria-hidden />
            Ajouter
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {field.state.value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Mots-clés ajoutés">
          {field.state.value.map((keyword, index) => {
            return (
              <li key={keyword}>
                <Badge variant="secondary" size="md" className="gap-1 pr-0.5">
                  {keyword}
                  <button
                    type="button"
                    aria-label={`Supprimer le mot-clé « ${keyword} »`}
                    className="-my-1 flex cursor-pointer items-center rounded-sm p-1.5 hover:bg-muted"
                    onClick={() => {
                      handleRemoveKeyword(index)
                    }}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            )
          })}
        </ul>
      ) : null}
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  )
}
