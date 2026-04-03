import { X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import type { useKeywordsField } from '~/hooks/use-keywords-field'
import { cn } from '~/lib/utils'
import { MEME_DESCRIPTION_MAX_LENGTH } from '~/routes/admin/-server/memes'
import type { AiAssistResult } from '~/server/ai'
import type { AiAssistFieldSelection } from './ai-assist-dialog'

type AiAssistPreviewParams = {
  currentValues: AiAssistResult
  selectedFields: AiAssistFieldSelection
  editedTitle: string
  editedDescription: string
  editedKeywords: string[]
  keywordsField: ReturnType<typeof useKeywordsField>
  onToggleField: (field: keyof AiAssistFieldSelection) => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

type CurrentValueParams = {
  value: string
}

const CurrentValue = ({ value }: CurrentValueParams) => {
  return (
    <p className="rounded-sm bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
      {value}
    </p>
  )
}

export const AiAssistPreview = ({
  currentValues,
  selectedFields,
  editedTitle,
  editedDescription,
  editedKeywords,
  keywordsField,
  onToggleField,
  onTitleChange,
  onDescriptionChange
}: AiAssistPreviewParams) => {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div
        className={cn(
          'flex flex-col gap-2 transition-opacity',
          !selectedFields.title && 'opacity-40'
        )}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id="ai-assist-select-title"
            checked={selectedFields.title}
            onCheckedChange={() => {
              onToggleField('title')
            }}
          />
          <Label htmlFor="ai-assist-select-title">Titre</Label>
        </div>
        <Input
          id="ai-assist-title"
          type="text"
          disabled={!selectedFields.title}
          value={editedTitle}
          onChange={(event) => {
            onTitleChange(event.target.value)
          }}
        />
        {currentValues.title ? (
          <CurrentValue value={currentValues.title} />
        ) : null}
      </div>
      <div
        className={cn(
          'flex flex-col gap-2 transition-opacity',
          !selectedFields.description && 'opacity-40'
        )}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id="ai-assist-select-description"
            checked={selectedFields.description}
            onCheckedChange={() => {
              onToggleField('description')
            }}
          />
          <Label htmlFor="ai-assist-select-description">Description</Label>
        </div>
        <div className="flex flex-col gap-1">
          <Textarea
            id="ai-assist-description"
            disabled={!selectedFields.description}
            value={editedDescription}
            onChange={(event) => {
              onDescriptionChange(event.target.value)
            }}
          />
          <span
            className="self-end text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {editedDescription.length}/{MEME_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
        {currentValues.description ? (
          <CurrentValue value={currentValues.description} />
        ) : null}
      </div>
      <div
        className={cn(
          'flex flex-col gap-2 transition-opacity',
          !selectedFields.keywords && 'opacity-40'
        )}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id="ai-assist-select-keywords"
            checked={selectedFields.keywords}
            onCheckedChange={() => {
              onToggleField('keywords')
            }}
          />
          <Label htmlFor="ai-assist-select-keywords">
            Mots-clés ({editedKeywords.length})
          </Label>
        </div>
        <Input
          id="ai-assist-keywords"
          type="text"
          disabled={!selectedFields.keywords}
          placeholder="Ajouter un mot-clé..."
          value={keywordsField.keywordValue}
          onChange={(event) => {
            keywordsField.setKeywordValue(event.target.value)
          }}
          enterKeyHint="done"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              keywordsField.handleAddKeyword()
            }
          }}
        />
        {editedKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {editedKeywords.map((keyword, index) => {
              return (
                <Badge variant="secondary" key={keyword}>
                  {keyword}
                  <button
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      keywordsField.handleRemoveKeyword(index)
                    }}
                    aria-label={`Supprimer le mot-clé "${keyword}"`}
                    type="button"
                    className="-m-1 flex cursor-pointer items-center rounded p-1.5 hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        ) : null}
        {currentValues.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 rounded-sm bg-muted/50 px-2.5 py-1.5">
            {currentValues.keywords.map((keyword) => {
              return (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {keyword}
                </Badge>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
